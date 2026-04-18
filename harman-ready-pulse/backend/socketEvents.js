const { checkEmergencyIntent, summarizeQueue } = require('./ai_engine/prompts');
const queue = require('./state/queue');
const preferences = require('./state/preferences');

let currentNetwork = "5G";

/**
 * Helper: Flushes the queue through the AI summarizer and emits results.
 * Called when entering 5G or on manual clear_queue.
 */
async function flushQueue(io) {
    const missedCount = queue.length;
    if (missedCount === 0) return;

    // Fetch sorted by priority, then chronologically
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

    queue.clear();
    io.emit('queue_updated', 0);
    io.emit('stats_updated', { bytesSaved: 0 });
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 New Device Connected: ${socket.id}`);

        // Initial State Sync
        socket.emit('network_state_changed', currentNetwork);
        socket.emit('queue_updated', queue.length);
        socket.emit('stats_updated', { bytesSaved: queue.savedData });

        /**
         * EVENT: network_state_changed
         * When the network switches to 5G and the queue has items,
         * auto-flush: summarize + clear the queue.
         */
        socket.on('network_state_changed', async (state) => {
            const previousNetwork = currentNetwork;
            currentNetwork = state;
            io.emit('network_state_changed', state);
            console.log(`[NETWORK] State changed to ${state}`);

            // Entering 5G from DEAD_ZONE → auto-flush the queue
            if (state === "5G" && previousNetwork === "DEAD_ZONE" && queue.length > 0) {
                console.log(`[NETWORK] Entered 5G with ${queue.length} queued messages. Auto-flushing...`);
                await flushQueue(io);
            }
        });

        /**
         * EVENT: inject_mock_message
         *
         * Decision tree (Patch 2):
         *   1. Compute priority via Preference Engine.
         *   2. Ask AI: is_emergency?
         *   3. If DEAD_ZONE:
         *        - emergency OR priority == 1 → deliver immediately
         *        - else → push to queue
         *   4. If 5G:
         *        - deliver everything immediately
         */
        socket.on('inject_mock_message', async (msg) => {
            msg.timestamp = msg.timestamp || Date.now();
            msg.app = msg.app || "Unknown";

            console.log(`[INCOMING] Text from ${msg.sender} via ${msg.app}`);

            try {
                // Step 1: Run the Priority Engine
                msg.priority = preferences.getPriority(msg.app, msg.sender);
                console.log(`[TRIAGE] Assigned Priority: ${msg.priority}`);

                // Step 2: Run the Edge AI Gatekeeper
                const isEmergency = await checkEmergencyIntent(msg.text);
                msg.is_emergency = isEmergency;

                // Step 3: Routing based on network state
                if (currentNetwork === "5G") {
                    // ── 5G: deliver everything live ──
                    if (isEmergency) {
                        io.emit('emergency_alert', { ...msg, is_emergency: true });
                        console.log("🚨 Emergency Alert Broadcasted (5G)");
                    } else {
                        io.emit('receive_live_message', msg);
                        console.log("📲 Live Message Broadcasted (5G)");
                    }
                } else {
                    // ── DEAD_ZONE routing ──
                    if (isEmergency || msg.priority === 1) {
                        // Critical: push through even in dead zone
                        if (isEmergency) {
                            io.emit('emergency_alert', { ...msg, is_emergency: true });
                            console.log("🚨 Emergency Alert Broadcasted (DEAD_ZONE override)");
                        } else {
                            io.emit('receive_live_message', msg);
                            console.log("📲 Priority-1 Message Delivered (DEAD_ZONE override)");
                        }
                    } else {
                        // Non-critical in dead zone → queue
                        queue.push(msg);
                        console.log(`📦 Message Queued. Current queue size: ${queue.length}`);

                        io.emit('queue_updated', queue.length);
                        io.emit('stats_updated', { bytesSaved: queue.savedData });
                    }
                }
            } catch (error) {
                console.error("[ERROR] Routing failed:", error);
                // Fallback: deliver it so the user doesn't lose a message
                io.emit('receive_live_message', msg);
            }
        });

        /**
         * EVENT: clear_queue (manual flush from UI)
         */
        socket.on('clear_queue', async () => {
            await flushQueue(io);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Device Disconnected: ${socket.id}`);
        });
    });
};