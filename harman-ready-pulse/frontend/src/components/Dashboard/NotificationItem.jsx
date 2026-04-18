import React from "react";
import { MessageCircle, Users, Hash, Bell, Mail, Play, Camera, AlertTriangle } from "lucide-react";

const getAppMetadata = (appName) => {
  switch (appName) {
    case "WhatsApp":
      return { title: "WhatsApp", Icon: MessageCircle, color: "text-green-400", bg: "bg-green-500/10" };
    case "Gmail":
      return { title: "Gmail", Icon: Mail, color: "text-red-400", bg: "bg-red-500/10" };
    case "Teams":
      return { title: "Teams", Icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" };
    case "Slack":
      return { title: "Slack", Icon: Hash, color: "text-purple-400", bg: "bg-purple-500/10" };
    case "YouTube":
      return { title: "YouTube", Icon: Play, color: "text-red-500", bg: "bg-red-500/10" };
    case "Instagram":
      return { title: "Instagram", Icon: Camera, color: "text-pink-400", bg: "bg-pink-500/10" };
    default:
      return { title: appName || "Notification", Icon: Bell, color: "text-gray-400", bg: "bg-gray-500/10" };
  }
};

const getPriorityBadge = (priority, isEmergency) => {
  if (isEmergency) {
    return { text: "Emergency", className: "bg-red-500 text-white animate-pulse" };
  }
  switch (priority) {
    case 1:
      return { text: "High", className: "bg-red-900/60 text-red-400 border border-red-700/50" };
    case 2:
      return { text: "Medium", className: "bg-yellow-900/40 text-yellow-400 border border-yellow-700/50" };
    case 3:
      return { text: "Low", className: "bg-gray-800/80 text-gray-500 border border-gray-700/50" };
    default:
      return { text: "Normal", className: "bg-gray-800 text-gray-500 border border-gray-700" };
  }
};

const NotificationItem = React.memo(({ msg, index = 0 }) => {
  const priority = msg.priority || 2;
  const { title, Icon, color, bg } = getAppMetadata(msg.app);
  const badge = getPriorityBadge(priority, msg.is_emergency);

  const displayTime = msg.displayTime || (
    typeof msg.timestamp === "number"
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : msg.timestamp
  );

  // Emergency styling
  if (msg.is_emergency) {
    return (
      <div
        className="animate-slide-in animate-emergency p-4 rounded-xl border border-red-500 bg-red-950/50 mb-3"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <span className="font-bold text-red-300 text-sm uppercase tracking-wide">{title}</span>
              <p className="text-red-400/70 text-[10px]">{msg.sender}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge.className}`}>
              {badge.text}
            </span>
            <span className="text-xs text-red-400/60 font-mono">{displayTime}</span>
          </div>
        </div>
        <p className="text-white font-medium text-sm">{msg.text}</p>
      </div>
    );
  }

  // Priority-based card styles
  let cardBorder = "border-gray-800/60";
  let cardBg = "glass";
  let textClass = "text-gray-300 text-sm";
  let opacityClass = "";

  if (priority === 1) {
    cardBorder = "border-orange-700/40";
    cardBg = "bg-orange-950/20";
  } else if (priority === 3) {
    cardBorder = "border-gray-800/40";
    opacityClass = "opacity-60";
    textClass = "text-gray-500 text-xs";
  }

  return (
    <div
      className={`animate-slide-in p-3.5 rounded-xl border ${cardBorder} ${cardBg} ${opacityClass} mb-2.5 hover:border-gray-600/50 transition-all duration-200`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
          </div>
          <div>
            <span className="font-semibold text-gray-300 text-xs uppercase tracking-wide">{title}</span>
            <p className="text-gray-500 text-[10px]">{msg.sender}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge.className}`}>
            {badge.text}
          </span>
          <span className="text-[10px] text-gray-600 font-mono">{displayTime}</span>
        </div>
      </div>
      <p className={`${textClass} mt-1.5 leading-relaxed`}>{msg.text}</p>
    </div>
  );
});

export default NotificationItem;
