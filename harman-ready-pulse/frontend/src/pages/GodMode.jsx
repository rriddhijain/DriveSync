import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ❌ NO socket creation here
// ✅ socket comes from props

export default function GodMode({ socket }) {
  const [msgText, setMsgText] = useState("");
  const [sender, setSender] = useState("Mom");

  const sendNetworkToggle = (state) => {
    socket.emit('toggle_network', { network: state });
  };

  const injectMessage = (isEmergency = false) => {
    const payload = {
      id: uuidv4(),
      sender: sender,
      text: isEmergency
        ? "⚠️ EMERGENCY: Rerouting required due to accident!"
        : msgText,
      is_emergency: isEmergency,
      timestamp: new Date().toLocaleTimeString()
    };

    socket.emit('inject_mock_message', payload);
    setMsgText("");
  };

  return (
    <div className="p-10 bg-gray-900 min-h-screen text-white font-mono">
      <h1 className="text-3xl font-bold mb-8 border-b border-gray-700 pb-4">
        🛠️ God-Mode Controller
      </h1>

      <div className="grid grid-cols-2 gap-10">
        
        {/* Network Toggle */}
        <div className="bg-gray-800 p-6 rounded-lg border border-blue-500/30">
          <h2 className="text-xl mb-4 text-blue-400">Environment Control</h2>
          <div className="flex gap-4">
            <button
              onClick={() => sendNetworkToggle('5G')}
              className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded font-bold"
            >
              SIGNAL: 5G ACTIVE
            </button>

            <button
              onClick={() => sendNetworkToggle('DEAD_ZONE')}
              className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded font-bold"
            >
              SIGNAL: DEAD ZONE
            </button>
          </div>
        </div>

        {/* Message Injector */}
        <div className="bg-gray-800 p-6 rounded-lg border border-purple-500/30">
          <h2 className="text-xl mb-4 text-purple-400">Message Injector</h2>

          <div className="space-y-4">
            <select
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full bg-gray-700 p-2 rounded text-white"
            >
              <option>Mom</option>
              <option>Boss</option>
              <option>Slack Bot</option>
              <option>Airtel Support</option>
            </select>

            <input
              type="text"
              placeholder="Type mock notification content..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => injectMessage(false)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 p-3 rounded font-bold"
              >
                Send Normal
              </button>

              <button
                onClick={() => injectMessage(true)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 p-3 rounded font-bold"
              >
                Send Emergency
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Override */}
      <div className="mt-10 bg-gray-800 p-6 rounded-lg border border-yellow-500/30">
        <h2 className="text-xl mb-4 text-yellow-400">System Overrides</h2>

        <button
          onClick={() => socket.emit('clear_queue')}
          className="w-full bg-yellow-600/20 hover:bg-yellow-600 border border-yellow-600 p-4 rounded font-bold"
        >
          FORCE CLEAR RAM QUEUE
        </button>
      </div>
    </div>
  );
}