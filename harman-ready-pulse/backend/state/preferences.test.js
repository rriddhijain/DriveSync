// backend/state/preferences.test.js
const preferences = require('./preferences');

describe('PreferencesManager', () => {
  test('should classify EMERGENCY intent as Priority 0 and not muted', () => {
    const res = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'Mom' }, 'EMERGENCY');
    expect(res).toEqual({ priority: 0, isContactOverride: false, isMuted: false });
  });

  test('should classify SPAM or OOO intents as Priority 999 and muted', () => {
    const resSpam = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'Mom' }, 'SPAM');
    expect(resSpam).toEqual({ priority: 999, isContactOverride: false, isMuted: true });

    const resOoo = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'Mom' }, 'OOO');
    expect(resOoo).toEqual({ priority: 999, isContactOverride: false, isMuted: true });
  });

  test('should route native apps with correct priority levels', () => {
    const resMaps = preferences.calculateAbsolutePriority({ app: 'Google Maps', sender: 'System' }, 'ROUTINE');
    expect(resMaps.priority).toBe(1);

    const resWeather = preferences.calculateAbsolutePriority({ app: 'Weather', sender: 'System' }, 'ROUTINE');
    expect(resWeather.priority).toBe(1);

    const resYoutube = preferences.calculateAbsolutePriority({ app: 'YouTube', sender: 'User' }, 'ROUTINE');
    expect(resYoutube.priority).toBe(3);
  });

  test('should apply contact priority overrides for WhatsApp', () => {
    // Mom is default high priority (Priority 1)
    const resMom = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'Mom' }, 'ROUTINE');
    expect(resMom).toEqual({ priority: 1, isContactOverride: true, isMuted: false });

    // Boss is default high priority (Priority 1)
    const resBoss = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'Boss' }, 'ROUTINE');
    expect(resBoss).toEqual({ priority: 1, isContactOverride: true, isMuted: false });

    // Standard user gets base app priority (Priority 2)
    const resOther = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'John' }, 'ROUTINE');
    expect(resOther).toEqual({ priority: 2, isContactOverride: false, isMuted: false });
  });

  test('should apply time window constraints correctly', () => {
    const appKey = 'whatsapp';
    // Artificially change time window for WhatsApp to 9 AM - 5 PM
    preferences.rules['WhatsApp'].timeWindow = { start: '09:00', end: '17:00' };

    // 1. Inside window (10:00 AM)
    const insideTimestamp = new Date('2026-06-25T10:00:00').getTime();
    const resInside = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'John', timestamp: insideTimestamp }, 'ROUTINE');
    expect(resInside.priority).toBe(2);

    // 2. Outside window (8:00 PM)
    const outsideTimestamp = new Date('2026-06-25T20:00:00').getTime();
    const resOutside = preferences.calculateAbsolutePriority({ app: 'WhatsApp', sender: 'John', timestamp: outsideTimestamp }, 'ROUTINE');
    expect(resOutside).toEqual({ priority: 999, isContactOverride: false, isMuted: true });

    // Reset rules to default 24h
    preferences.rules['WhatsApp'].timeWindow = { start: '00:00', end: '23:59' };
  });

  test('should handle missing or malformed inputs gracefully without crashing', () => {
    // Undefined message
    const resNull = preferences.calculateAbsolutePriority(null, 'ROUTINE');
    expect(resNull.priority).toBe(3);

    // Empty object
    const resEmpty = preferences.calculateAbsolutePriority({}, 'ROUTINE');
    expect(resEmpty.priority).toBe(3);

    // Missing app name
    const resNoApp = preferences.calculateAbsolutePriority({ sender: 'Mom' }, 'ROUTINE');
    expect(resNoApp.priority).toBe(3);
  });
});
