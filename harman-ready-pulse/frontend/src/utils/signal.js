/**
 * Signal Strength Calculator
 * 
 * Calculates a simulated signal strength (0.0 - 1.0) at a given location
 * using inverse-distance-weighted averaging of the 3 closest heatmap points.
 * 
 * @module utils/signal
 */

/**
 * Haversine distance between two [lat, lng] points in meters.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the simulated signal strength at a given car location.
 *
 * Uses the inverse-distance-weighted average of the K closest heatmap points.
 * Each heatmap point is [lat, lng, intensity] where intensity is 0.0–1.0.
 *
 * @param {number} carLat  - Car latitude
 * @param {number} carLng  - Car longitude
 * @param {Array<[number, number, number]>} heatmapPoints - Array of [lat, lng, intensity]
 * @param {number} [k=3] - Number of nearest neighbours to consider
 * @returns {number} Interpolated signal strength between 0.0 and 1.0
 */
export function calculateSignalAtLocation(carLat, carLng, heatmapPoints, k = 3) {
  if (!heatmapPoints || heatmapPoints.length === 0) return 1.0;

  // Calculate distance from car to every heatmap point
  /** @type {Array<{dist: number, intensity: number}>} */
  const withDistance = heatmapPoints.map(([lat, lng, intensity]) => ({
    dist: haversine(carLat, carLng, lat, lng),
    intensity: intensity ?? 1.0,
  }));

  // Sort by distance ascending, take the K closest
  withDistance.sort((a, b) => a.dist - b.dist);
  const nearest = withDistance.slice(0, k);

  // Edge case: if the car is exactly on a point (dist ≈ 0), return that intensity (clamped)
  if (nearest[0].dist < 1) return Math.max(0, Math.min(1, nearest[0].intensity));

  // Inverse-distance weighting: weight = 1 / dist²
  let weightedSum = 0;
  let weightTotal = 0;

  for (const { dist, intensity } of nearest) {
    const weight = 1 / (dist * dist);
    weightedSum += weight * intensity;
    weightTotal += weight;
  }

  const signal = weightTotal > 0 ? weightedSum / weightTotal : 1.0;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, signal));
}
