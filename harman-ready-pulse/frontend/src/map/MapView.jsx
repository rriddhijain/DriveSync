/**
 * MapView — Main Map Dashboard Component
 *
 * Renders the Leaflet map with:
 *  - Signal strength heatmap overlay
 *  - Simulated car driving through dead zones
 *  - Hysteresis-based network state (fast-fail / slow-recover)
 *  - Socket.io emission on state transitions only
 *
 * @module map/MapView
 */

import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useEffect, useState, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { socket } from "../socket";
import UnifiedHeatmapLayer from "../components/Dashboard/UnifiedHeatmapLayer";
import { calculateSignalAtLocation } from "../utils/signal";
import { useNetworkStability } from "../hooks/useNetworkStability";

// ── Fix: Leaflet default marker icons broken in Vite builds ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ══════════════════════════════════════════════════════════════
// HEATMAP DATA — Signal strength points across Bengaluru
// Format: [lat, lng, intensity]  where intensity = 0.0 (dead) to 1.0 (full 5G)
// ══════════════════════════════════════════════════════════════
const HEATMAP_POINTS = [
  // ── Strong 5G zones (Green) ──
  [13.0050, 77.6400, 1.0],   // North start — strong signal
  [12.9950, 77.6400, 0.95],
  [12.9900, 77.6350, 0.9],
  [12.9550, 77.6150, 0.95],  // Between dead zones — strong
  [12.9500, 77.6250, 0.9],

  // ── Dead Zone 1: Indiranagar (Jio Failure) ──
  [12.9800, 77.6400, 0.15],  // Core dead zone — very weak
  [12.9750, 77.6350, 0.2],
  [12.9700, 77.6300, 0.25],
  [12.9850, 77.6450, 0.2],
  [12.9750, 77.6450, 0.18],
  [12.9700, 77.6500, 0.22],
  [12.9800, 77.6300, 0.3],   // Edge — slightly better
  [12.9900, 77.6500, 0.35],  // Transition — yellow zone

  // ── Transition zone (Yellow) ──
  [12.9650, 77.6300, 0.55],  // Between zones — patchy
  [12.9600, 77.6250, 0.5],
  [12.9550, 77.6300, 0.65],
  [12.9500, 77.6200, 0.7],

  // ── Dead Zone 2: Koramangala (Airtel Failure) ──
  [12.9300, 77.6200, 0.1],   // Core dead zone — near zero
  [12.9250, 77.6150, 0.15],
  [12.9350, 77.6250, 0.2],
  [12.9200, 77.6100, 0.12],
  [12.9300, 77.6100, 0.18],
  [12.9400, 77.6300, 0.25],
  [12.9200, 77.6300, 0.2],

  // ── Strong signal at the end (recovery zone) ──
  [12.9100, 77.6200, 0.85],
  [12.9050, 77.6200, 0.92],
  [12.9000, 77.6150, 0.95],
];

// ══════════════════════════════════════════════════════════════
// SIMULATION ROUTE — Drives through both dead zones
// Format: [lng, lat] (GeoJSON standard)
// ══════════════════════════════════════════════════════════════
const SIMULATION_COORDS = [
  [77.6400, 13.0000],   // Start — strong 5G
  [77.6400, 12.9950],
  [77.6400, 12.9900],
  [77.6400, 12.9850],   // Entering Dead Zone 1
  [77.6400, 12.9800],   // Inside Dead Zone 1 — FAST FAIL
  [77.6400, 12.9750],
  [77.6380, 12.9700],
  [77.6350, 12.9650],   // Leaving Dead Zone 1 — yellow zone
  [77.6300, 12.9600],
  [77.6250, 12.9550],   // Transition — recovering
  [77.6200, 12.9500],   // Strong again — SLOW RECOVER (3s)
  [77.6200, 12.9450],   // Should be 5G after timer
  [77.6200, 12.9400],   // Entering Dead Zone 2
  [77.6200, 12.9350],
  [77.6200, 12.9300],   // Inside Dead Zone 2 — FAST FAIL
  [77.6200, 12.9250],
  [77.6200, 12.9200],
  [77.6200, 12.9150],   // Leaving Dead Zone 2
  [77.6200, 12.9100],   // Recovery zone
  [77.6200, 12.9050],   // Strong signal — SLOW RECOVER
];

export default function MapView() {
  // ── State ──
  const [route, setRoute] = useState([]);
  const [position, setPosition] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rawSignal, setRawSignal] = useState(1.0);

  // ── Refs ──
  const indexRef = useRef(0);
  const prevNetworkStateRef = useRef("5G");

  // ── Hysteresis hook ──
  const { stableNetworkState, isRecovering, recoveryProgress } = useNetworkStability(rawSignal);

  // ── Initialize route ──
  useEffect(() => {
    const coords = SIMULATION_COORDS.map(c => [c[1], c[0]]); // [lat, lng] for Leaflet
    setRoute(coords);
    setPosition(coords[0]);

    const handleSimulationState = (state) => {
      if (state.playing !== undefined) setIsPlaying(state.playing);
    };

    socket.on("simulation_state", handleSimulationState);
    
    return () => {
      socket.off("simulation_state", handleSimulationState);
    };
  }, []);

  // ── Drive simulation loop ──
  useEffect(() => {
    if (route.length === 0 || !isPlaying) return;

    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % route.length;
      const newPos = route[indexRef.current]; // [lat, lng]
      setPosition(newPos);

      // Calculate signal at current car location
      const signal = calculateSignalAtLocation(newPos[0], newPos[1], HEATMAP_POINTS);
      setRawSignal(signal);
    }, 2000);

    return () => clearInterval(interval);
  }, [route, isPlaying]);

  // ── Emit network state ONLY on transitions ──
  useEffect(() => {
    if (stableNetworkState !== prevNetworkStateRef.current) {
      prevNetworkStateRef.current = stableNetworkState;
      socket.emit("network_state_changed", stableNetworkState);
    }
  }, [stableNetworkState]);

  // ── Signal strength indicator color ──
  const getSignalColor = useCallback((signal) => {
    if (signal >= 0.8) return "#22c55e"; // Green
    if (signal >= 0.6) return "#eab308"; // Yellow
    if (signal >= 0.4) return "#f97316"; // Orange
    return "#ef4444";                      // Red
  }, []);

  const mapCenter = [12.9550, 77.6300];

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {/* Signal Heatmap Overlay */}
        <UnifiedHeatmapLayer data={HEATMAP_POINTS} />

        {/* Route Polyline */}
        {route.length > 0 && (
          <Polyline positions={route} color="#3b82f6" weight={4} opacity={0.7} dashArray="8 6" />
        )}

        {/* Car Marker */}
        {position && <Marker position={position} />}
      </MapContainer>

      {/* ── Signal Strength HUD (bottom-left overlay) ── */}
      <div style={{
        position: "absolute", bottom: 16, left: 16, zIndex: 1000,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
        border: `1px solid ${getSignalColor(rawSignal)}40`,
        borderRadius: 14, padding: "12px 16px", minWidth: 180,
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {/* Signal strength bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Signal
          </span>
          <div style={{
            flex: 1, height: 6, borderRadius: 3,
            background: "rgba(55,65,81,0.5)",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${rawSignal * 100}%`, height: "100%", borderRadius: 3,
              background: getSignalColor(rawSignal),
              transition: "width 0.3s ease, background 0.3s ease",
            }} />
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, fontFamily: "monospace",
            color: getSignalColor(rawSignal),
          }}>
            {(rawSignal * 100).toFixed(0)}%
          </span>
        </div>

        {/* Network state */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 12, fontWeight: 800,
            color: stableNetworkState === "5G" ? "#22c55e" : "#ef4444",
          }}>
            {stableNetworkState === "5G" ? "● 5G" : "● DEAD ZONE"}
          </span>

          {/* Recovery progress indicator */}
          {isRecovering && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#eab308", fontWeight: 600 }}>
                Recovering
              </span>
              <div style={{
                width: 40, height: 4, borderRadius: 2,
                background: "rgba(55,65,81,0.5)",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${recoveryProgress * 100}%`, height: "100%",
                  background: "#eab308", borderRadius: 2,
                  transition: "width 0.1s linear",
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}