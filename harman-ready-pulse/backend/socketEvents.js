const { classifyMessageIntent, summarizeQueue } = require('./ai_engine/prompts');
const queue = require('./state/queue');
const preferences = require('./state/preferences');

// Shared system state encapsulated in a single object
const systemState = {
    currentNetwork: "5G",
    deadZoneStartTime: null
};

/** Emit the full stats snapshot to all clients */
function broadcastStats(io) {
    io.emit('stats_updated', queue.stats);
}

function formatDuration(ms) {
    const elapsedSecs = Math.floor(ms / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

/**
 * Flushes the queue through the AI summarizer and emits results.
 * Called when entering 5G or on manual clear_queue.
 */
async function flushQueue(io, timeOffline) {
    const missedCount = queue.length;
    if (missedCount === 0) return;

    const messagesToProcess = queue.getAllSorted();

    console.log(`[AI] Summarizing ${missedCount} prioritized messages...`);

    let summaryText = "";
    try {
        summaryText = await summarizeQueue(messagesToProcess);
        io.emit('ai_summary_generated', { text: summaryText, count: missedCount, offlineDuration: formatDuration(timeOffline || 0), messages: messagesToProcess });
    } catch (error) {
        console.error("[AI ERROR]", error);
        io.emit('ai_summary_generated', {
            text: `Welcome back. You missed ${missedCount} updates.`,
            count: missedCount,
            offlineDuration: formatDuration(timeOffline || 0),
            messages: messagesToProcess
        });
    }

    queue.clear();
    io.emit('queue_updated', 0);
    broadcastStats(io);
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 New Device Connected: ${socket.id}`);

        // Initial State Sync (Now includes preferences rules)
        socket.emit('network_state_changed', systemState.currentNetwork);
        socket.emit('queue_updated', queue.length);
        socket.emit('stats_updated', queue.stats);
        socket.emit('preferences_updated', preferences.rules);

        /**
         * EVENT: network_state_changed
         * When switching to 5G from DEAD_ZONE, auto-flush the pending queue.
         */
        socket.on('network_state_changed', async (state) => {
            if (typeof state !== 'string' || !['5G', 'DEAD_ZONE'].includes(state)) {
                console.warn(`[WARN] Invalid network state: ${state}`);
                return;
            }
            const previousNetwork = systemState.currentNetwork;
            systemState.currentNetwork = state;
            io.emit('network_state_changed', state);
            console.log(`[NETWORK] State changed to ${state}`);

            if (state === "DEAD_ZONE" && previousNetwork === "5G") {
                systemState.deadZoneStartTime = Date.now();
            }

            if (state === "5G" && previousNetwork === "DEAD_ZONE" && queue.length > 0) {
                const timeOffline = systemState.deadZoneStartTime ? (Date.now() - systemState.deadZoneStartTime) : 0;
                console.log(`[NETWORK] Entered 5G with ${queue.length} pending. Auto-flushing for ${timeOffline}ms...`);
                await flushQueue(io, timeOffline);
            }
        });

        /**
         * EVENT: inject_mock_message
         */
        socket.on('inject_mock_message', async (msg) => {
            if (!msg || typeof msg !== 'object') {
                console.warn("[WARN] Invalid message payload: null or not an object");
                return;
            }
            if (typeof msg.text !== 'string' || !msg.text.trim()) {
                console.warn("[WARN] Invalid message text: must be a non-empty string");
                return;
            }
            const normalizedApp = typeof msg.app === 'string' ? msg.app.trim() : "Unknown";
            const normalizedSender = typeof msg.sender === 'string' ? msg.sender.trim() : normalizedApp;

            const safeMsg = {
                id: typeof msg.id === 'string' && msg.id ? msg.id : require('uuid').v4(),
                app: normalizedApp,
                sender: normalizedSender,
                text: msg.text.trim(),
                is_emergency: !!msg.is_emergency,
                timestamp: typeof msg.timestamp === 'number' && msg.timestamp > 0 ? msg.timestamp : Date.now()
            };

            // Step 1: Edge AI Classification (Async)
            const intent = safeMsg.is_emergency ? 'EMERGENCY' : await classifyMessageIntent(safeMsg.text);
            safeMsg.intent = intent;

            // Step 2: Algorithmic Triage (Sync Priority Scoring)
            const priorityData = preferences.calculateAbsolutePriority(safeMsg, intent);
            safeMsg.absolutePriority = priorityData.priority;
            
            // Setting helpers for UI / Logging
            safeMsg.is_emergency = (safeMsg.absolutePriority === 0);
            safeMsg.isContactOverride = priorityData.isContactOverride;
            safeMsg.isMuted = priorityData.isMuted;
            safeMsg.priority = safeMsg.absolutePriority;

            console.log(`[TRIAGE] Message from ${safeMsg.sender} on ${safeMsg.app} -> Intent: ${intent}, Absolute Priority: ${safeMsg.absolutePriority}`);

            // Step 3: Network Routing
            if (systemState.currentNetwork === "5G") {
                queue.trackDelivered(safeMsg);
                io.emit('receive_live_message', safeMsg);
                console.log(`📲 Live Message Broadcasted (5G) - Priority: ${safeMsg.absolutePriority}`);
            } else {
                // DEAD_ZONE Logic
                if (safeMsg.absolutePriority === 0 || safeMsg.absolutePriority === 1) {
                    // Bypass queue (Emergency or Priority 1 / Rank 1 VIP)
                    queue.trackDelivered(safeMsg);
                    if (safeMsg.absolutePriority === 0) {
                        io.emit('emergency_alert', safeMsg);
                        console.log("🚨 Emergency Alert Broadcasted (DEAD_ZONE)");
                    } else {
                        io.emit('receive_live_message', safeMsg);
                        console.log("⚡ Priority 1 Breakthrough Broadcasted (DEAD_ZONE)");
                    }
                } else {
                    // Queue for Later (Absolute Priority > 1)
                    queue.push(safeMsg);
                    console.log(`📦 Message Queued (Priority ${safeMsg.absolutePriority}). Current queue size: ${queue.length}`);
                    io.emit('queue_updated', queue.length, queue.savedData); // Count & bytes saved
                    broadcastStats(io); // Update full stats
                }
            }
        });

        /**
         * EVENT: update_preferences
         */
        socket.on('update_preferences', (config) => {
            if (!config || typeof config !== 'object' || Array.isArray(config)) {
                console.warn("[WARN] Invalid preferences config received");
                return;
            }
            Object.keys(config).forEach(appId => {
                // Prototype pollution check
                if (appId === '__proto__' || appId === 'constructor') return;

                const appConfig = config[appId];
                if (!appConfig || typeof appConfig !== 'object') return;

                const ruleKey = Object.keys(preferences.rules).find(
                    k => k.toLowerCase() === appId.toLowerCase()
                );
                if (ruleKey) {
                    // Validate basePriority
                    const newPriority = parseInt(appConfig.basePriority, 10);
                    if (!isNaN(newPriority) && [1, 2, 3].includes(newPriority)) {
                        preferences.rules[ruleKey].basePriority = newPriority;
                    }

                    // Validate timeWindow
                    if (appConfig.timeWindow && typeof appConfig.timeWindow === 'object') {
                        const { start, end } = appConfig.timeWindow;
                        if (typeof start === 'string' && typeof end === 'string') {
                            preferences.rules[ruleKey].timeWindow = { start, end };
                        }
                    }

                    // Validate contactOverrides
                    if (appConfig.contactOverrides && typeof appConfig.contactOverrides === 'object' && !Array.isArray(appConfig.contactOverrides)) {
                        const safeOverrides = {};
                        Object.keys(appConfig.contactOverrides).forEach(contactName => {
                            if (contactName === '__proto__' || contactName === 'constructor') return;
                            const priorityVal = parseInt(appConfig.contactOverrides[contactName], 10);
                            if (!isNaN(priorityVal) && [1, 2, 3].includes(priorityVal)) {
                                safeOverrides[contactName] = priorityVal;
                            }
                        });
                        preferences.rules[ruleKey].contactOverrides = safeOverrides;
                    }
                }
            });
            console.log('[PREFS] User preferences updated and validated');
            io.emit('preferences_updated', preferences.rules);
        });

        /** EVENT: clear_queue (manual flush from UI) */
        socket.on('clear_queue', async () => {
            await flushQueue(io);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Device Disconnected: ${socket.id}`);
        });
    });
};