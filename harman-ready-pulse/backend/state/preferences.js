// backend/state/preferences.js

class PreferencesManager {
  constructor() {
    // 1 = High, 2 = Medium, 3 = Low (Queue Only)
    // activeWindow uses 24-hour integers (0-23)
    this.rules = {
      "WhatsApp": {
        basePriority: 2,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {
          "Mom": 1,
          "Boss": 1
        }
      },
      "Gmail": {
        basePriority: 1,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      },
      "Slack": {
        basePriority: 1,
        timeWindow: { start: "09:00", end: "20:00" },
        contactOverrides: {}
      },
      "Teams": {
        basePriority: 1,
        timeWindow: { start: "09:00", end: "20:00" },
        contactOverrides: {}
      },
      "Instagram": {
        basePriority: 3,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      },
      "YouTube": {
        basePriority: 3,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      }
    };
  }

  /**
   * THE TRIAGE PROTOCOL
   * Returns an object { priority: number, isContactOverride: boolean }
   *
   * Logic:
   *  1. Time Gate (Highest Override): Check timestamp against timeWindow.
   *     If outside, demote to Priority 999.
   *  2. VIP Override (Second Highest): If inside time slot, check contactOverrides.
   *     If found, return contact's specific priority.
   *  3. Base Priority (Fallback): Return app's basePriority.
   */
  calculateAbsolutePriority(message) {
    const { app: appName, sender, timestamp } = message;
    const app = this.rules[appName];
    if (!app) return { priority: 3, isContactOverride: false }; // Unknown apps default to Priority 3

    // 1. Time Gate (Highest Override)
    const msgDate = timestamp ? new Date(timestamp) : new Date();
    const currentHour = msgDate.getHours();
    const currentMinute = msgDate.getMinutes();

    let inWindow = true;
    if (app.timeWindow && app.timeWindow.start && app.timeWindow.end) {
      const [startHour, startMin] = app.timeWindow.start.split(':').map(Number);
      const [endHour, endMin] = app.timeWindow.end.split(':').map(Number);
      const msgTime = currentHour * 60 + currentMinute;
      const startTime = startHour * 60 + (startMin || 0);
      const endTime = endHour * 60 + (endMin || 0);
      
      if (msgTime < startTime || msgTime >= endTime) {
        inWindow = false;
      }
    }

    if (!inWindow) {
      console.log(`[PRIORITY] ${appName} is outside time window. Demoting to Priority 3.`);
      return { priority: 3, isContactOverride: false };
    }

    // 2. VIP Override (Second Highest)
    if (app.contactOverrides && app.contactOverrides[sender] !== undefined) {
      return { priority: app.contactOverrides[sender], isContactOverride: true };
    }

    // 3. Base Priority (Fallback)
    return { priority: app.basePriority, isContactOverride: false };
  }
}

module.exports = new PreferencesManager();