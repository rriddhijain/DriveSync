import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, LayoutDashboard, Cpu, ChevronDown } from 'lucide-react';
import { socket } from "../../socket";

export default function TopNavbar() {
  const [provider, setProvider] = useState("Airtel");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleProvider = (newProvider) => {
      setProvider(newProvider);
    };
    
    socket.on('provider_changed', handleProvider);
    return () => socket.off('provider_changed', handleProvider);
  }, []);

  const handleProviderSelect = (p) => {
    socket.emit('set_provider', p);
    setShowDropdown(false);
  };

  return (
    <nav className="flex-none flex items-center justify-between px-8 py-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 shadow-lg z-[9999] sticky top-0">
      {/* Left: Logo / Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          <Cpu className="text-white w-6 h-6" />
        </div>
        <NavLink to="/" className="flex flex-col">
          <span className="text-xl font-bold tracking-widest text-white uppercase">DriveSync</span>
          <span className="text-xs text-blue-400 font-medium tracking-widest uppercase">System Interface</span>
        </NavLink>
      </div>

      {/* Right: Navigation Links */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-between w-32 gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 border bg-gray-800/80 text-gray-300 border-gray-700/50 hover:bg-gray-700 hover:text-white"
          >
            <span>{provider}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          
          {showDropdown && (
            <div className="absolute top-full mt-2 w-full bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-xl overflow-hidden z-[9999]">
              <button 
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                onClick={() => handleProviderSelect("Airtel")}
              >
                Airtel
              </button>
              <div className="h-px w-full bg-gray-700/50"></div>
              <button 
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                onClick={() => handleProviderSelect("Jio")}
              >
                Jio
              </button>
            </div>
          )}
        </div>

        <NavLink
          to="/fleet"
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 border ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700 hover:text-white hover:border-gray-600'
            }`
          }
        >
          <Cpu className="w-5 h-5" />
          <span>Fleet Telemetry</span>
        </NavLink>
        <NavLink
          to="/preferences"
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 border ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700 hover:text-white hover:border-gray-600'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span>Preferences</span>
        </NavLink>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 border ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700 hover:text-white hover:border-gray-600'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>
      </div>
    </nav>
  );
}
