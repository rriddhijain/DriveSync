import React, { createContext, useState, useEffect } from 'react';
import { socket } from '../socket';

export const PreferencesContext = createContext();

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState({
    "emergency services": { priority: 1, timeRange: [0, 24] },
    "google maps": { priority: 1, timeRange: [0, 24] },
    "weather": { priority: 1, timeRange: [0, 24] },
    "whatsapp": { priority: 2, timeRange: [0, 24] },
    "outlook": { priority: 2, timeRange: [0, 24] },
    "youtube": { priority: 3, timeRange: [0, 24] }
  });

  const [contactPriorities, setContactPriorities] = useState({
    "whatsapp": [
      { id: "mom", name: "Mom" },
      { id: "boss", name: "Boss" },
      { id: "john", name: "John Doe" },
    ],
    "outlook": [
      { id: "ceo", name: "ceo@harman.com" },
      { id: "project-lead", name: "project-lead@harman.com" },
      { id: "it-support", name: "it-support@harman.com" },
    ]
  });

  useEffect(() => {
    const handlePrefsUpdated = (rules) => {
      if (!rules) return;
      
      const newPrefs = {};
      const newContacts = { whatsapp: [], outlook: [] };

      Object.keys(rules).forEach(appId => {
        const rule = rules[appId];
        
        let timeRange = [0, 24];
        if (rule.timeWindow && rule.timeWindow.start && rule.timeWindow.end) {
          const startHour = parseInt(rule.timeWindow.start.split(':')[0], 10);
          const endHour = parseInt(rule.timeWindow.end.split(':')[0], 10);
          if (!isNaN(startHour) && !isNaN(endHour)) {
            timeRange = [startHour, endHour];
          }
        }

        newPrefs[appId.toLowerCase()] = {
          priority: rule.basePriority,
          timeRange: timeRange
        };

        if (['WhatsApp', 'Outlook'].includes(appId) && rule.contactOverrides) {
          const appIdLower = appId.toLowerCase();
          const overrides = rule.contactOverrides;
          
          const sortedContacts = Object.keys(overrides)
            .map(name => ({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name: name,
              priority: overrides[name]
            }))
            .sort((a, b) => a.priority - b.priority);
          
          newContacts[appIdLower] = sortedContacts;
        }
      });

      setPreferences(prev => ({ ...prev, ...newPrefs }));
      setContactPriorities(prev => ({
        ...prev,
        whatsapp: newContacts.whatsapp.length > 0 ? newContacts.whatsapp : prev.whatsapp,
        outlook: newContacts.outlook.length > 0 ? newContacts.outlook : prev.outlook
      }));
    };

    socket.on('preferences_updated', handlePrefsUpdated);
    return () => socket.off('preferences_updated', handlePrefsUpdated);
  }, []);

  const updatePreference = (appId, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [appId]: { ...prev[appId], [field]: value }
    }));
  };

  const addContact = (appId, name) => {
    if (!name.trim() || !contactPriorities[appId]) return;
    const newId = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!contactPriorities[appId].some(c => c.id === newId)) {
      setContactPriorities(prev => ({
        ...prev,
        [appId]: [...prev[appId], { id: newId, name }]
      }));
    }
  };

  const updateContactOrder = (appId, newOrder) => {
    setContactPriorities(prev => ({
      ...prev,
      [appId]: newOrder
    }));
  };

  const formatTime = (hour) => `${String(hour).padStart(2, '0')}:00`;

  const savePreferences = () => {
    const formattedPrefs = {};
    
    Object.keys(preferences).forEach(appId => {
      const contactOverridesMap = {};
      if (['whatsapp', 'outlook'].includes(appId) && contactPriorities[appId]) {
        contactPriorities[appId].forEach((contact, index) => {
          contactOverridesMap[contact.name] = index <= 1 ? 1 : 2;
        });
      }

      formattedPrefs[appId] = {
        basePriority: preferences[appId].priority,
        timeWindow: {
          start: formatTime(preferences[appId].timeRange[0]),
          end: formatTime(preferences[appId].timeRange[1])
        },
        contactOverrides: contactOverridesMap
      };
    });

    socket.emit("update_preferences", formattedPrefs);
  };

  return (
    <PreferencesContext.Provider value={{
      preferences,
      setPreferences,
      updatePreference,
      contactPriorities,
      setContactPriorities: updateContactOrder,
      addContact,
      savePreferences
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}
