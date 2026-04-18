import { useEffect, useState, useRef } from "react";
import { socket } from "../../socket";
import { Settings, Wifi, WifiOff, Bell } from "lucide-react";

import NotificationList from "./NotificationList";
import MetricsPanel from "./MetricsPanel";
import SmartSummary from "./SmartSummary";
import SettingsModal from "./SettingsModal";
import MapView from "../../map/MapView";

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [bytesSaved, setBytesSaved] = useState(0);
  const [network, setNetwork] = useState("5G");
  const [summary, setSummary] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const queueThrottleRef = useRef(null);
  const latestQueueCountRef = useRef(0);

  const isDead = network === "DEAD_ZONE";

  useEffect(() => {
    const handleMessage = (msg) => setMessages((prev) => [msg, ...prev]);

    const handleEmergency = (msg) => {
      setMessages((prev) => [msg, ...prev]);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Emergency Alert: ${msg.text}`);
        utterance.rate = 1.2;
        utterance.pitch = 1.3;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleQueue = (count) => {
      latestQueueCountRef.current = count;
      if (!queueThrottleRef.current) {
        setQueueCount(count);
        queueThrottleRef.current = setTimeout(() => {
          setQueueCount(latestQueueCountRef.current);
          queueThrottleRef.current = null;
        }, 500);
      }
    };

    const handleNetwork = (state) => setNetwork(state);

    const handleSummary = (data) => {
      const text = data.text;
      setSummary(text);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleStats = (data) => {
      setBytesSaved(data.bytesSaved || 0);
    };

    socket.on("receive_live_message", handleMessage);
    socket.on("emergency_alert", handleEmergency);
    socket.on("queue_updated", handleQueue);
    socket.on("network_state_changed", handleNetwork);
    socket.on("ai_summary_generated", handleSummary);
    socket.on("stats_updated", handleStats);

    return () => {
      socket.off("receive_live_message", handleMessage);
      socket.off("emergency_alert", handleEmergency);
      socket.off("queue_updated", handleQueue);
      socket.off("network_state_changed", handleNetwork);
      socket.off("ai_summary_generated", handleSummary);
      socket.off("stats_updated", handleStats);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: isDead ? "#0d0000" : "#080b14",
        boxShadow: isDead ? "inset 0 0 60px rgba(220,38,38,0.3)" : "none",
        overflow: "hidden",
        color: "#f3f4f6",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          height: "52px",
          flexShrink: 0,
          borderBottom: `1px solid ${isDead ? "#7f1d1d" : "#111827"}`,
          background: "rgba(0,0,0,0.7)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">
            Harman Ready-Pulse
          </span>
        </div>

        {/* Network status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isDead
            ? "bg-red-950 border-red-800 text-red-400 animate-pulse"
            : "bg-green-950 border-green-800 text-green-400"
        }`}>
          {isDead ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {isDead ? "DEAD ZONE" : "5G CONNECTED"}
        </div>

        {/* Queue banner + Preferences */}
        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-700/50 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Bell className="w-3 h-3" />
              {queueCount} deferred
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 transition-all"
          >
            <Settings className="w-4 h-4" />
            Preferences
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT: MAP + NOTIFICATIONS ── */}
      <div style={{ display: "flex", width: "100%", height: "calc(100vh - 52px)", overflow: "hidden" }}>

        {/* LEFT: Map (60%) */}
        <div style={{ position: "relative", width: "60%", height: "100%", flexShrink: 0 }}>
          {/* Map label overlay */}
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            border: "1px solid rgba(156,163,175,0.2)",
            padding: "4px 10px", borderRadius: 8,
            fontSize: 11, color: "#9ca3af",
            fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Live Route — Bengaluru
          </div>
          <MapView />
        </div>

        {/* RIGHT: Notifications (40%) */}
        <div style={{
          display: "flex", flexDirection: "column",
          width: "40%", height: "100%",
          borderLeft: "1px solid #111827",
          background: "#080b14",
        }}>
          {/* Notifications header */}
          <div style={{
            flexShrink: 0, padding: "12px 20px",
            borderBottom: "1px solid #111827",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>Notifications</span>
            {messages.length > 0 && (
              <span style={{
                background: "rgba(30,58,138,0.5)", border: "1px solid rgba(29,78,216,0.5)",
                color: "#60a5fa", fontSize: 11, padding: "2px 8px", borderRadius: 999,
              }}>
                {messages.length}
              </span>
            )}
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {messages.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#374151" }}>
                <Bell style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No notifications yet</p>
                <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>Messages will appear here</p>
              </div>
            ) : (
              <NotificationList messages={messages} />
            )}
          </div>

          {/* Bottom panel: Summary + Metrics */}
          <div style={{ flexShrink: 0, borderTop: "1px solid #111827", padding: "12px 16px" }}>
            <SmartSummary text={summary} />
            <div style={{ marginTop: summary ? 8 : 0 }}>
              <MetricsPanel queueCount={queueCount} bytesSaved={bytesSaved} />
            </div>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(config) => socket.emit("update_preferences", config)}
      />
    </div>
  );
}