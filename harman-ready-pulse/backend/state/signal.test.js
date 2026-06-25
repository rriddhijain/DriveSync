// backend/state/signal.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Zero-dependency dynamic ESM bridge to test frontend utils in backend Jest CommonJS environment
const esmPath = path.join(__dirname, '../../frontend/src/utils/signal.js');
const esmCode = fs.readFileSync(esmPath, 'utf8');
const cjsCode = esmCode
  .replace(/export function/g, 'function')
  .replace(/export /g, '') + '\nmodule.exports = { calculateSignalAtLocation };';

const mockModule = { exports: {} };
const context = vm.createContext({
  module: mockModule,
  exports: mockModule.exports,
  Math,
  console
});

vm.runInContext(cjsCode, context);
const { calculateSignalAtLocation } = mockModule.exports;

describe('Signal Strength Calculator', () => {
  const HEATMAP_POINTS = [
    [13.00, 77.60, 1.0], // Full signal zone
    [12.95, 77.60, 0.5], // Medium signal zone
    [12.90, 77.60, 0.0]  // Dead zone
  ];

  test('should return 1.0 if heatmap points are empty or missing', () => {
    expect(calculateSignalAtLocation(12.95, 77.60, [])).toBe(1.0);
    expect(calculateSignalAtLocation(12.95, 77.60, null)).toBe(1.0);
  });

  test('should return exact intensity if car is directly on a point', () => {
    // Car exactly on the 1.0 signal point
    const signal = calculateSignalAtLocation(13.00, 77.60, HEATMAP_POINTS);
    expect(signal).toBe(1.0);
  });

  test('should interpolate signal using inverse-distance weighting', () => {
    // Car exactly midway between 1.0 and 0.0 signal points (at 12.95)
    // The closest points are:
    // 1. [12.95, 77.60] (dist = 0 -> direct hit, handled above)
    // Let's place car at 12.975 (midway between 13.00 and 12.95)
    const signal = calculateSignalAtLocation(12.975, 77.60, HEATMAP_POINTS, 2);
    // Since it's exactly midway between 1.0 and 0.5, and they are equal distance,
    // the inverse-distance weights are equal, so it should be the simple average: 0.75
    expect(signal).toBeCloseTo(0.75);
  });

  test('should clamp final signal to [0, 1]', () => {
    const customPoints = [[13.00, 77.60, 1.5]]; // Invalid raw intensity
    const signalMax = calculateSignalAtLocation(13.00, 77.60, customPoints);
    expect(signalMax).toBe(1.0);

    const customPointsMin = [[13.00, 77.60, -0.5]];
    const signalMin = calculateSignalAtLocation(13.00, 77.60, customPointsMin);
    expect(signalMin).toBe(0.0);
  });
});
