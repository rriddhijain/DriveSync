// backend/state/preferences.js

class PreferencesManager {
  constructor() {
    // 1 = High, 2 = Medium, 3 = Low (Queue Only)
    // activeWindow uses 24-hour integers (0-23)
    this.rules = {
      "Gmail": { priority: 1, activeWindow: { start: 9, end: 17 } },
      "Slack": { priority: 1, activeWindow: { start: 9, end: 17 } },
      "Teams": { priority: 1, activeWindow: { start: 9, end: 18 } },
      "Instagram": { priority: 3 },
      "YouTube": { priority: 3 },
      "WhatsApp": {
        priority: 2,
        contacts: {
          "Mom": { priority: 1 },
          "Boss": { priority: 1 },
          "SpamBot": { priority: 3 }
        }
      }
    };
  }

  /**
   * Helper: Checks if the current hour falls within the window.
   * If no activeWindow is defined on the app, the message is always "in-window".
   */
  isWithinWindow(activeWindow) {
    if (!activeWindow) return true; // No window means always active
    const currentHour = new Date().getHours();
    return currentHour >= activeWindow.start && currentHour < activeWindow.end;
  }

  /**
   * THE TRIAGE PROTOCOL
   * Returns a priority integer (1, 2, or 3).
   *
   * Logic:
   *  1. Look up the app. Unknown apps default to Priority 3.
   *  2. If the app is WhatsApp, check for a contact-level override.
   *  3. If the current time is OUTSIDE the app's activeWindow, demote to 3.
   *  4. Return the computed priority.
   */
  getPriority(appName, sender) {
    const app = this.rules[appName];
    if (!app) return 3; // Unknown apps default to lowest priority

    let basePriority = app.priority;

    // 1. WhatsApp Contact Override
    if (appName === "WhatsApp" && app.contacts && app.contacts[sender]) {
      basePriority = app.contacts[sender].priority;
    }

    // 2. Time Window Demotion Check
    if (!this.isWithinWindow(app.activeWindow)) {
      console.log(`[PRIORITY] ${appName} is outside active window. Demoting to Priority 3.`);
      return 3;
    }

    return basePriority;
  }
}

module.exports = new PreferencesManager();