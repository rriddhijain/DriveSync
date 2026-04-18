import React from "react";
import { MessageCircle, Users, Hash, PhoneCall, Bell, Mail, Play, Camera } from "lucide-react";

// Helper to determine app metadata based on the app name field
const getAppMetadata = (appName) => {
  switch (appName) {
    case "WhatsApp":
      return { title: "WhatsApp", Icon: MessageCircle, color: "text-green-400" };
    case "Gmail":
      return { title: "Gmail", Icon: Mail, color: "text-red-400" };
    case "Teams":
      return { title: "Teams", Icon: Users, color: "text-indigo-400" };
    case "Slack":
      return { title: "Slack", Icon: Hash, color: "text-purple-400" };
    case "YouTube":
      return { title: "YouTube", Icon: Play, color: "text-red-500" };
    case "Instagram":
      return { title: "Instagram", Icon: Camera, color: "text-pink-400" };
    default:
      return { title: appName || "Notification", Icon: Bell, color: "text-gray-400" };
  }
};

const NotificationItem = React.memo(({ msg }) => {
  const priority = msg.priority || 2; 
  const { title, Icon, color } = getAppMetadata(msg.app);

  // Use displayTime if available, fall back to formatting the numeric timestamp
  const displayTime = msg.displayTime || (
    typeof msg.timestamp === "number"
      ? new Date(msg.timestamp).toLocaleTimeString()
      : msg.timestamp
  );

  let containerClass = "bg-gray-800 border-gray-700";
  let textClass = "text-gray-200 text-sm mt-2";
  let opacityClass = "opacity-100";

  if (priority === 1 || msg.is_emergency) {
    containerClass = "bg-red-900/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    textClass = "text-white font-medium text-sm mt-2";
  } else if (priority === 3) {
    containerClass = "bg-gray-800/50 border-gray-800";
    textClass = "text-gray-500 text-xs mt-2";
    opacityClass = "opacity-60";
  }

  return (
    <div className={`p-4 rounded-xl border mb-3 ${containerClass} ${opacityClass} transition-all duration-300`}>
      {/* Header Row */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="font-bold text-gray-300 tracking-wide text-sm uppercase">{title}</span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{displayTime}</span>
      </div>

      {/* Sub-Header (Sender) */}
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-400 text-xs">{msg.sender}</span>
        {msg.is_emergency && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Emergency</span>}
      </div>

      {/* Content */}
      <p className={textClass}>{msg.text}</p>
    </div>
  );
});

export default NotificationItem;
