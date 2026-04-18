const { checkEmergencyIntent, summarizeQueue } = require('./ai_engine/prompts');
const queue = require('./state/queue');
const preferences = require('./state/preferences');

let currentNetwork = "5G";

/** Emit the full stats snapshot to all clients */
function broadcastStats(io) {
    io.emit('stats_updated', queue.stats);
}

/**
 * Flushes the queue through the AI summarizer and emits results.
 * Called when entering 5G or on manual clear_queue.
 */
async function flushQueue(io) {
    const missedCount = queue.length;
    if (missedCount === 0) return;

    const messagesToProcess = queue.getAllSorted();

    console.log(`[AI] Summarizing ${missedCount} prioritized messages...`);

    try {
        const summaryText = await summarizeQueue(messagesToProcess);
        io.emit('ai_summary_generated', { text: summaryText, count: missedCount });
    } catch (error) {
        console.error("[AI ERROR]", error);
        io.emit('ai_summary_generated', {
            text: `Welcome back. You missed ${missedCount} updates.`,
            count: missedCount
        });
    }

    // Atomic grouped batch delivery of the missed notifications
    io.emit('receive_batch_messages', messagesToProcess);

    queue.clear();
    io.emit('queue_updated', 0);
    broadcastStats(io);
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 New Device Connected: ${socket.id}`);

        // Initial State Sync
        socket.emit('network_state_changed', currentNetwork);
        socket.emit('queue_updated', queue.length);
        socket.emit('stats_updated', queue.stats);

        /**
         * EVENT: network_state_changed
         * When switching to 5G from DEAD_ZONE, auto-flush the pending queue.
         */
        socket.on('network_state_changed', async (state) => {
            const previousNetwork = currentNetwork;
            currentNetwork = state;
            io.emit('network_state_changed', state);
            console.log(`[NETWORK] State changed to ${state}`);

            if (state === "5G" && previousNetwork === "DEAD_ZONE" && queue.length > 0) {
                console.log(`[NETWORK] Entered 5G with ${queue.length} pending. Auto-flushing...`);
                await flushQueue(io);
            }
        });

        /**
         * EVENT: inject_mock_message
         *
         * Routing Decision Tree:
         *   1. Compute priority via Preference Engine
         *   2. Ask AI: is_emergency?
         *   3. DEAD_ZONE:
         *        - emergency OR priority === 1 → deliver immediately
         *        - P2, P3 → defer to queue
         *   4. 5G:
         *        - deliver everything immediately
         */
        socket.on('inject_mock_message', async (msg) => {
            msg.timestamp = msg.timestamp || Date.now();
            msg.app = msg.app || "Unknown";

            console.log(`[INCOMING] Text from ${msg.sender} via ${msg.app}`);

            try {
                // Step 1: Priority Engine
                const priorityData = preferences.calculateAbsolutePriority(msg);
                msg.absolutePriority = priorityData.priority;
                msg.isContactOverride = priorityData.isContactOverride;
                msg.priority = msg.absolutePriority; // 1=High, 2=Medium, 3=Low
                console.log(`[TRIAGE] Assigned Absolute Priority: ${msg.absolutePriority}`);

                // Step 2: Edge AI Gatekeeper
                const isEmergency = await checkEmergencyIntent(msg.text);
                msg.is_emergency = isEmergency;

                // Step 3: Route based on network
                // Note: isEmergency = AI determination. msg.is_emergency = client flag (from GodMode TRIGGER EMERGENCY).
                // Both must be respected.
                const emergencyFlag = isEmergency || msg.is_emergency;
                msg.is_emergency = emergencyFlag; // normalise so UI always gets the right flag

                if (currentNetwork === "5G") {
                    // 5G: deliver everything live
                    queue.trackDelivered(msg);
                    if (emergencyFlag) {
                        io.emit('emergency_alert', { ...msg, is_emergency: true });
                        console.log("🚨 Emergency Alert (5G)");
                    } else {
                        io.emit('receive_live_message', msg);
                        console.log("📲 Live Message (5G)");
                    }
                    broadcastStats(io);
                } else {
                    // DEAD_ZONE: only emergencies and P1 break through
                    if (emergencyFlag || msg.absolutePriority === 1) {
                        queue.trackDelivered(msg);
                        if (emergencyFlag) {
                            io.emit('emergency_alert', { ...msg, is_emergency: true });
                            console.log("🚨 Emergency Alert (DEAD_ZONE override)");
                        } else {
                            io.emit('receive_live_message', msg);
                            console.log("📲 Priority-1 Delivered (DEAD_ZONE override)");
                        }
                    } else {
                        // P2, P3 → defer
                        queue.push(msg);
                        console.log(`📦 Deferred (P${msg.absolutePriority}). Pending: ${queue.length}`);
                        io.emit('queue_updated', queue.length);
                    }
                    broadcastStats(io);
                }
            } catch (error) {
                console.error("[ERROR] Routing failed:", error);
                io.emit('receive_live_message', msg);
            }
        });

        /**
         * EVENT: update_preferences
         * Receives config from the Settings modal and updates the engine.
         */
        socket.on('update_preferences', (config) => {
            if (!config) return;
            // Map frontend config format to backend rules
            Object.keys(config).forEach(appId => {
                const appConfig = config[appId];
                // Find matching rule by lowercasing
                const ruleKey = Object.keys(preferences.rules).find(
                    k => k.toLowerCase() === appId.toLowerCase()
                );
                if (ruleKey && appConfig.basePriority) {
                    preferences.rules[ruleKey].basePriority = appConfig.basePriority;
                    if (appConfig.timeWindow) {
                        preferences.rules[ruleKey].timeWindow = {
                            start: appConfig.timeWindow.start,
                            end: appConfig.timeWindow.end
                        };
                    }
                    if (appConfig.contactOverrides) {
                        preferences.rules[ruleKey].contactOverrides = { ...appConfig.contactOverrides };
                    }
                }
            });
            console.log('[PREFS] User preferences updated from Settings UI');
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