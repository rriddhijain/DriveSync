import React, { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { MessageCircle, Hash, Users, Mail, Play, Camera, ChevronDown } from "lucide-react";

const APPS = [
  { id: "whatsapp", name: "WhatsApp", Icon: MessageCircle, color: "text-green-500" },
  { id: "gmail", name: "Gmail", Icon: Mail, color: "text-red-500" },
  { id: "slack", name: "Slack", Icon: Hash, color: "text-purple-500" },
  { id: "teams", name: "Teams", Icon: Users, color: "text-indigo-500" },
  { id: "youtube", name: "YouTube", Icon: Play, color: "text-red-400" },
  { id: "instagram", name: "Instagram", Icon: Camera, color: "text-pink-500" },
];

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [preferences, setPreferences] = useState({
    whatsapp: { priority: 2, timeRange: [0, 24], contactPriority: "Mom" },
    gmail: { priority: 1, timeRange: [9, 17] },
    slack: { priority: 1, timeRange: [9, 17] },
    teams: { priority: 1, timeRange: [9, 18] },
    youtube: { priority: 3, timeRange: [0, 24] },
    instagram: { priority: 3, timeRange: [0, 24] }
  });

  const [expandedApp, setExpandedApp] = useState("whatsapp");

  if (!isOpen) return null;

  const handleUpdate = (appId, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [appId]: { ...prev[appId], [field]: value }
    }));
  };

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  const formatTime = (hour) => `${String(hour).padStart(2, '0')}:00`;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[600px] max-w-full text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div>
            <h2 className="text-2xl font-bold tracking-wide">Preference Dashboard</h2>
            <p className="text-gray-400 text-sm mt-1">Configure app priorities and allowed hours</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl">&times;</button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {APPS.map((app) => {
            const isExpanded = expandedApp === app.id;
            const prefs = preferences[app.id];

            return (
              <div key={app.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-300">
                {/* App Header (Clickable to expand) */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/50"
                  onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                >
                  <div className="flex items-center gap-3">
                    <app.Icon className={`w-6 h-6 ${app.color}`} />
                    <span className="font-semibold text-lg">{app.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${prefs.priority === 1 ? 'bg-red-900/50 text-red-400' : prefs.priority === 2 ? 'bg-gray-700 text-gray-300' : 'bg-gray-900 text-gray-500'}`}>
                      Priority {prefs.priority}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-700 bg-gray-800/30 space-y-6">
                    {/* Priority Dropdown */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2 font-medium">Global Priority Level</label>
                      <select 
                        value={prefs.priority} 
                        onChange={(e) => handleUpdate(app.id, 'priority', parseInt(e.target.value, 10))}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-gray-200"
                      >
                        <option value={1}>Priority 1: High (Emergency / VIP)</option>
                        <option value={2}>Priority 2: Medium (Standard)</option>
                        <option value={3}>Priority 3: Low (Muted / Faded)</option>
                      </select>
                    </div>

                    {/* Time Range Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm text-gray-400 font-medium">Allowed Time Range</label>
                        <span className="text-sm font-mono bg-gray-900 px-2 py-1 rounded border border-gray-700">
                          {formatTime(prefs.timeRange[0])} - {formatTime(prefs.timeRange[1])}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          range
                          min={0}
                          max={24}
                          value={prefs.timeRange}
                          onChange={(val) => handleUpdate(app.id, 'timeRange', val)}
                          trackStyle={[{ backgroundColor: '#3b82f6', height: 6 }]}
                          handleStyle={[
                            { borderColor: '#60a5fa', height: 16, width: 16, backgroundColor: '#1e3a8a' },
                            { borderColor: '#60a5fa', height: 16, width: 16, backgroundColor: '#1e3a8a' }
                          ]}
                          railStyle={{ backgroundColor: '#374151', height: 6 }}
                        />
                      </div>
                    </div>

                    {/* WhatsApp Specific Sub-menu */}
                    {app.id === "whatsapp" && (
                      <div className="pt-4 border-t border-gray-700/50">
                        <label className="block text-sm text-gray-400 mb-2 font-medium">Contact Priority (Overrides Global)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={prefs.contactPriority}
                            onChange={(e) => handleUpdate(app.id, 'contactPriority', e.target.value)}
                            placeholder="e.g. Mom, Boss"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 focus:outline-none focus:border-green-500 text-gray-200"
                          />
                          <div className="bg-red-900/40 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center">
                            Priority 1
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Messages from this contact will always be treated as Priority 1.</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(59,130,246,0.4)]">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
