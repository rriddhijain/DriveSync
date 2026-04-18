import { useEffect, useState, useRef } from "react";
import { socket } from "../../socket";
import { Settings, Wifi, WifiOff, Bell, Shield, ShieldAlert } from "lucide-react";

import NotificationList from "./NotificationList";
import MetricsPanel from "./MetricsPanel";
import SmartSummary from "./SmartSummary";
import SettingsModal from "./SettingsModal";
import MapView from "../../map/MapView";

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [stats, setStats] = useState({});
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
      setStats(data || {});
      // Sync pending count from stats if available
      if (data?.pendingCount !== undefined) {
        setQueueCount(data.pendingCount);
      }
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
      className={isDead ? "dead-zone-vignette" : ""}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: isDead ? "#0a0000" : "#080b14",
        overflow: "hidden",
        color: "#f3f4f6",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "background 0.6s ease",
      }}
    >
      {/* ── HEADER ── */}
      <header
        className="glass-dark"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          height: "52px",
          flexShrink: 0,
          borderBottom: `1px solid ${isDead ? "rgba(127,29,29,0.5)" : "rgba(17,24,39,0.8)"}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isDead ? "bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" : "bg-blue-500 shadow-[0_0_8px_#3b82f6]"}`} />
          <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">
            Harman Ready-Pulse
          </span>
        </div>

        {/* Network status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-500 ${
          isDead
            ? "bg-red-950/80 border-red-800 text-red-400 animate-pulse"
            : "bg-green-950/80 border-green-800 text-green-400"
        }`}>
          {isDead ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {isDead ? "DEAD ZONE" : "5G CONNECTED"}
        </div>

        {/* Queue banner + Preferences */}
        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-semibold animate-fade-up">
              <Bell className="w-3 h-3" />
              {queueCount} pending
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-white border border-gray-800/50 hover:border-gray-600 hover:bg-gray-800/50 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            Preferences
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT: MAP + NOTIFICATIONS ── */}
      <div style={{ display: "flex", width: "100%", height: "calc(100vh - 52px)", overflow: "hidden" }}>

        {/* LEFT: Map (60%) */}
        <div style={{ position: "relative", width: "60%", height: "100%", flexShrink: 0 }}>
          {/* Map label overlay */}
          <div className="glass" style={{
            position: "absolute", top: 12, left: 12, zIndex: 1000,
            padding: "4px 10px", borderRadius: 8,
            fontSize: 11, color: "#9ca3af",
            fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Live Route — Bengaluru
          </div>

          {/* Dead Zone warning overlay on map */}
          {isDead && (
            <div
              className="animate-fade-up"
              style={{
                position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                zIndex: 1000, display: "flex", alignItems: "center", gap: 8,
                background: "rgba(127,29,29,0.85)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(239,68,68,0.4)",
                padding: "8px 16px", borderRadius: 12,
                fontSize: 11, color: "#fca5a5", fontWeight: 600,
              }}
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Low connectivity — Only emergency &amp; priority alerts active</span>
            </div>
          )}

          <MapView />
        </div>

        {/* RIGHT: Notifications (40%) */}
        <div style={{
          display: "flex", flexDirection: "column",
          width: "40%", height: "100%",
          borderLeft: `1px solid ${isDead ? "rgba(127,29,29,0.3)" : "rgba(17,24,39,0.8)"}`,
          background: isDead ? "rgba(10,0,0,0.5)" : "rgba(8,11,20,0.5)",
          transition: "background 0.6s ease",
        }}>
          {/* Notifications header */}
          <div style={{
            flexShrink: 0, padding: "10px 20px",
            borderBottom: `1px solid ${isDead ? "rgba(127,29,29,0.3)" : "rgba(17,24,39,0.8)"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div className="flex items-center gap-2">
              {isDead ? (
                <Shield className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-gray-600" />
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: isDead ? "#ef4444" : "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {isDead ? "Critical Alerts Only" : "Notifications"}
              </span>
            </div>
            {messages.length > 0 && (
              <span className="glass" style={{
                color: isDead ? "#f87171" : "#60a5fa", fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 700,
              }}>
                {messages.length}
              </span>
            )}
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
            {messages.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1f2937" }}>
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
                  <Bell style={{ width: 28, height: 28, opacity: 0.2, color: "#4b5563" }} />
                </div>
                <p style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>No notifications yet</p>
                <p style={{ fontSize: 11, marginTop: 4, color: "#1f2937" }}>Messages will appear here in real-time</p>
              </div>
            ) : (
              <NotificationList messages={messages} />
            )}
          </div>

          {/* Bottom panel: Summary + Metrics */}
          <div style={{
            flexShrink: 0,
            borderTop: `1px solid ${isDead ? "rgba(127,29,29,0.3)" : "rgba(17,24,39,0.8)"}`,
            padding: "10px 14px",
            background: isDead ? "rgba(10,0,0,0.3)" : "rgba(0,0,0,0.2)",
          }}>
            <SmartSummary text={summary} />
            <MetricsPanel stats={stats} />
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