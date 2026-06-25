// backend/state/preferences.js

class PreferencesManager {
  constructor() {
    // 1 = High, 2 = Medium, 3 = Low (Queue Only)
    // activeWindow uses 24-hour integers (0-23)
    this.rules = {
      "Emergency Services": {
        basePriority: 1,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      },
      "Google Maps": {
        basePriority: 1,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      },
      "Weather": {
        basePriority: 1,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {}
      },
      "WhatsApp": {
        basePriority: 2,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {
          "Mom": 1,
          "Boss": 1
        }
      },
      "Outlook": {
        basePriority: 2,
        timeWindow: { start: "00:00", end: "23:59" },
        contactOverrides: {
          "ceo@harman.com": 1,
          "project-lead@harman.com": 1
        }
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
   * Returns an object { priority: number, isContactOverride: boolean, isMuted: boolean }
   *
   * Logic:
   *  1. AI Intent Override
   *  2. Native Priority (Maps/Emergency/Weather = 1)
   *  3. Time Gate (WhatsApp)
   *  4. VIP Override (WhatsApp)
   *  5. Base Priority
   */
  calculateAbsolutePriority(message, intent) {
    if (!message) {
      return { priority: 3, isContactOverride: false, isMuted: false };
    }
    const appName = typeof message.app === 'string' ? message.app.trim() : "Unknown";
    const sender = typeof message.sender === 'string' ? message.sender.trim() : "Unknown";
    const timestamp = typeof message.timestamp === 'number' ? message.timestamp : Date.now();
    
    // Step 1: AI Intent Override
    if (intent === 'EMERGENCY') {
      return { priority: 0, isContactOverride: false, isMuted: false };
    }
    if (intent === 'SPAM' || intent === 'OOO') {
      return { priority: 999, isContactOverride: false, isMuted: true };
    }

    // Checking Native Apps
    const normalizedApp = appName.toLowerCase();
    if (['emergency services', 'google maps', 'weather'].includes(normalizedApp)) {
      return { priority: 1, isContactOverride: false, isMuted: false };
    }

    if (normalizedApp === 'youtube') {
      return { priority: 3, isContactOverride: false, isMuted: false };
    }

    // Step 2 & 3: WhatsApp and Outlook Routing
    if (['whatsapp', 'outlook'].includes(normalizedApp)) {
      const appKey = Object.keys(this.rules).find(k => k.toLowerCase() === normalizedApp);
      const app = this.rules[appKey] || { basePriority: 2, timeWindow: null, contactOverrides: {} };
      
      const msgDate = new Date(timestamp);
      const currentHour = msgDate.getHours();
      const currentMinute = msgDate.getMinutes();

      let inWindow = true;
      if (app.timeWindow && typeof app.timeWindow.start === 'string' && typeof app.timeWindow.end === 'string') {
        const startParts = app.timeWindow.start.split(':').map(Number);
        const endParts = app.timeWindow.end.split(':').map(Number);
        const startHour = isNaN(startParts[0]) ? 0 : startParts[0];
        const startMin = isNaN(startParts[1]) ? 0 : startParts[1];
        const endHour = isNaN(endParts[0]) ? 23 : endParts[0];
        const endMin = isNaN(endParts[1]) ? 59 : endParts[1];

        const msgTime = currentHour * 60 + currentMinute;
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (msgTime < startTime || msgTime >= endTime) {
          inWindow = false;
        }
      }

      if (!inWindow) {
        console.log(`[PRIORITY] ${appName} is outside time window. Demoting to Priority 999 (Lowest).`);
        return { priority: 999, isContactOverride: false, isMuted: true };
      }

      const override = app.contactOverrides && Object.keys(app.contactOverrides).find(k => k.toLowerCase() === sender.toLowerCase());
      if (override) {
        return { priority: app.contactOverrides[override], isContactOverride: true, isMuted: false };
      }

      return { priority: app.basePriority, isContactOverride: false, isMuted: false };
    }

    // Step 4: Unknown apps default to Priority 3
    return { priority: 3, isContactOverride: false, isMuted: false };
  }
}

module.exports = new PreferencesManager();