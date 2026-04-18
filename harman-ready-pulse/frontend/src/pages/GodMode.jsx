import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Play, Pause, Radio, MessageSquarePlus, Zap } from 'lucide-react';

export default function GodMode({ socket }) {
  const [msgText, setMsgText] = useState("");
  const [sender, setSender] = useState("Mom");
  const [app, setApp] = useState("WhatsApp");
  const [isPlaying, setIsPlaying] = useState(true);

  const sendNetworkToggle = (state) => {
    socket.emit('network_state_changed', state);
  };

  const toggleSimulation = (playState) => {
    setIsPlaying(playState);
    socket.emit('simulation_state', { playing: playState });
  };

  const injectMessage = (isEmergency = false) => {
    const payload = {
      id: uuidv4(),
      app: app,
      sender: sender,
      text: isEmergency
        ? "⚠️ EMERGENCY: Rerouting required due to accident!"
        : msgText,
      is_emergency: isEmergency,
      timestamp: Date.now(),
      displayTime: new Date().toLocaleTimeString()
    };

    socket.emit('inject_mock_message', payload);
    setMsgText("");
  };

  return (
    <div className="p-10 bg-black min-h-screen text-white font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-10 pb-6 border-b border-gray-800 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 uppercase tracking-widest flex items-center gap-4">
          <Zap className="w-10 h-10 text-yellow-400" />
          Control Pit
        </h1>

        <div className="grid grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="space-y-8">
            
            {/* Simulation Control */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold mb-6 text-gray-300 flex items-center gap-2">
                <Radio className="w-5 h-5" /> Map Simulation
              </h2>
              <div className="flex gap-4">
                <button
                  onClick={() => toggleSimulation(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                    isPlaying ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Play className="w-5 h-5" /> PLAY
                </button>
                <button
                  onClick={() => toggleSimulation(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                    !isPlaying ? 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(202,138,4,0.5)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Pause className="w-5 h-5" /> PAUSE
                </button>
              </div>
            </div>

            {/* Network Toggle */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold mb-6 text-gray-300">Environment Control</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => sendNetworkToggle('5G')}
                  className="flex-1 bg-gray-800 hover:bg-blue-600 hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] py-4 rounded-xl font-bold transition-all"
                >
                  5G ACTIVE
                </button>
                <button
                  onClick={() => sendNetworkToggle('DEAD_ZONE')}
                  className="flex-1 bg-gray-800 hover:bg-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] py-4 rounded-xl font-bold transition-all"
                >
                  DEAD ZONE
                </button>
              </div>
            </div>

            {/* System Override */}
            <div className="bg-red-900/20 border border-red-900/50 p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-red-400">System Overrides</h2>
              <button
                onClick={() => socket.emit('clear_queue')}
                className="w-full bg-red-950 hover:bg-red-900 border border-red-800 py-4 rounded-xl font-bold text-red-300 transition-colors"
              >
                FORCE CLEAR RAM QUEUE
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Message Injector */}
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl flex flex-col">
            <h2 className="text-xl font-bold mb-8 text-gray-300 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5" /> Message Injector
            </h2>

            <div className="space-y-6 flex-1">
              <div>
                <label className="block text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wider">Target App</label>
                <select
                  value={app}
                  onChange={(e) => setApp(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option>WhatsApp</option>
                  <option>Gmail</option>
                  <option>Slack</option>
                  <option>Teams</option>
                  <option>YouTube</option>
                  <option>Instagram</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wider">Sender Name</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="e.g. Mom, Boss, Support"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wider">Payload Content</label>
                <textarea
                  rows="4"
                  placeholder="Type mock notification content..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-8 border-t border-gray-800">
              <button
                onClick={() => injectMessage(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Send Normal
              </button>

              <button
                onClick={() => injectMessage(true)}
                className="flex-1 bg-orange-600 hover:bg-orange-500 py-4 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(234,88,12,0.4)]"
              >
                Send Emergency
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}