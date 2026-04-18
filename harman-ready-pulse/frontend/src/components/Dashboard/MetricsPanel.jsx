import React from "react";
import { Clock, Database, Send, TrendingUp } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MetricsPanel({ stats = {} }) {
  const { pendingCount = 0, deliveredCount = 0, deferredCount = 0, bytesSaved = 0 } = stats;
  const totalProcessed = deliveredCount + deferredCount;
  const deliveryRate = totalProcessed > 0 ? Math.round((deliveredCount / totalProcessed) * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Pending */}
      <div className="glass rounded-lg px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3 h-3 text-yellow-500" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Pending</p>
        </div>
        <p className="text-sm font-bold text-white">{pendingCount}</p>
      </div>

      {/* Delivered */}
      <div className="glass rounded-lg px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Send className="w-3 h-3 text-blue-400" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Delivered</p>
        </div>
        <p className="text-sm font-bold text-white">{deliveredCount}</p>
      </div>

      {/* Delivery Rate */}
      <div className="glass rounded-lg px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Live Rate</p>
        </div>
        <p className="text-sm font-bold text-white">{deliveryRate}%</p>
      </div>

      {/* Data Saved */}
      <div className="glass rounded-lg px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Database className="w-3 h-3 text-green-400" />
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Saved</p>
        </div>
        <p className="text-sm font-bold text-white">{formatBytes(bytesSaved)}</p>
      </div>
    </div>
  );
}