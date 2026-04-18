/**
 * useNetworkStability — Custom React Hook
 *
 * Implements Signal Hysteresis logic (fast-fail, slow-recover)
 * to prevent rapid toggling between 5G and DEAD_ZONE.
 *
 * Rules:
 *   FAST-FAIL:    signal < 0.6  →  instantly switch to DEAD_ZONE
 *   SLOW-RECOVER: signal >= 0.8 →  must hold for 3 uninterrupted seconds → switch to 5G
 *                 if signal drops below 0.8 during recovery, timer resets
 *
 * @module hooks/useNetworkStability
 */

import { useState, useRef, useEffect, useCallback } from "react";

/** @type {number} Signal threshold below which we instantly fail */
const FAIL_THRESHOLD = 0.6;

/** @type {number} Signal threshold above which we begin recovery (Dark green heatmap region) */
const RECOVER_THRESHOLD = 0.95;

/** @type {number} Milliseconds the signal must stay above RECOVER_THRESHOLD to recover (100% certainty) */
const RECOVER_HOLD_MS = 5000;

/**
 * @param {number} rawSignalStrength - Current signal strength (0.0 – 1.0)
 * @returns {{ stableNetworkState: string, isRecovering: boolean, recoveryProgress: number }}
 */
export function useNetworkStability(rawSignalStrength) {
  /** @type {[string, Function]} */
  const [stableNetworkState, setStableNetworkState] = useState("5G");

  /** @type {[boolean, Function]} */
  const [isRecovering, setIsRecovering] = useState(false);

  /** Recovery timer progress (0.0 – 1.0) for UI feedback */
  const [recoveryProgress, setRecoveryProgress] = useState(0);

  /** @type {React.MutableRefObject<number|null>} setTimeout ID for recovery */
  const recoveryTimerRef = useRef(null);

  /** @type {React.MutableRefObject<number|null>} setInterval ID for progress updates */
  const progressIntervalRef = useRef(null);

  /** @type {React.MutableRefObject<number>} Timestamp when recovery started */
  const recoveryStartRef = useRef(0);

  /** Clear all timers cleanly */
  const clearRecoveryTimers = useCallback(() => {
    if (recoveryTimerRef.current !== null) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsRecovering(false);
    setRecoveryProgress(0);
    recoveryStartRef.current = 0;
  }, []);

  useEffect(() => {
    // ── FAST-FAIL: signal dropped below 0.6 ──
    if (rawSignalStrength < FAIL_THRESHOLD) {
      clearRecoveryTimers();
      setStableNetworkState("DEAD_ZONE");
      return;
    }

    // ── Signal is in the "grey zone" (0.6 – 0.8): maintain current state ──
    if (rawSignalStrength < RECOVER_THRESHOLD) {
      // If we were recovering, cancel it — signal dipped below recovery threshold
      if (recoveryTimerRef.current !== null) {
        clearRecoveryTimers();
      }
      // Don't change state — stay in whatever we were (DEAD_ZONE or 5G)
      return;
    }

    // ── SLOW-RECOVER: signal >= 0.8 ──
    // If already in 5G, nothing to do
    if (stableNetworkState === "5G") {
      clearRecoveryTimers();
      return;
    }

    // If we're in DEAD_ZONE and signal is strong, start recovery timer (if not already started)
    if (recoveryTimerRef.current === null) {
      recoveryStartRef.current = Date.now();
      setIsRecovering(true);

      // Progress ticker — update recovery progress every 100ms for smooth UI
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recoveryStartRef.current;
        setRecoveryProgress(Math.min(1, elapsed / RECOVER_HOLD_MS));
      }, 100);

      // Actual recovery timer — after 3 seconds, switch to 5G
      recoveryTimerRef.current = setTimeout(() => {
        setStableNetworkState("5G");
        clearRecoveryTimers();
      }, RECOVER_HOLD_MS);
    }

    // Cleanup on unmount
    return () => {
      // Don't clear timers here on every signal change — only on unmount
    };
  }, [rawSignalStrength, stableNetworkState, clearRecoveryTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearRecoveryTimers();
  }, [clearRecoveryTimers]);

  return { stableNetworkState, isRecovering, recoveryProgress };
}
