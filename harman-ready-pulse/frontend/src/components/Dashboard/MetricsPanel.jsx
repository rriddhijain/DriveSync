import React from "react";
import { Layers, Database } from "lucide-react";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MetricsPanel({ queueCount, bytesSaved = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-500 flex-none" />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Queued</p>
          <p className="text-sm font-bold text-white">{queueCount}</p>
        </div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
        <Database className="w-4 h-4 text-green-500 flex-none" />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Data Saved</p>
          <p className="text-sm font-bold text-white">{formatBytes(bytesSaved)}</p>
        </div>
      </div>
    </div>
  );
}