import React, { useMemo } from "react";
import NotificationItem from "./NotificationItem";

export default function NotificationList({ messages }) {
  // Emergency/P1 pinned to top, rest maintain chronological order (newest first)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const priorityA = a.priority || 2;
      const priorityB = b.priority || 2;
      // Emergency always on top
      if (a.is_emergency && !b.is_emergency) return -1;
      if (b.is_emergency && !a.is_emergency) return 1;
      // Then P1
      if (priorityA === 1 && priorityB !== 1) return -1;
      if (priorityB === 1 && priorityA !== 1) return 1;
      // Rest keep insertion order (newest first)
      return 0;
    });
  }, [messages]);

  return (
    <div className="space-y-1">
      {sortedMessages.map((msg, i) => (
        <NotificationItem key={msg.id} msg={msg} index={i} />
      ))}
    </div>
  );
}