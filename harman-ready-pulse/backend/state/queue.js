// backend/state/queue.js

class NotificationQueue {
  constructor() {
    this.messages = [];
    this.bytesSaved = 0; // Track data footprint
  }
  
  push(msg) { 
    this.messages.push(msg); 
    
    // Calculate rough byte size of the payload (UTF-8)
    const size = Buffer.byteLength(JSON.stringify(msg), 'utf8');
    this.bytesSaved += size;
  }
  
  /**
   * Sorting Engine: Priority first (ascending), then timestamp (oldest first).
   * Uses the compact comparator from the spec.
   */
  getAllSorted() { 
    return [...this.messages].sort(
      (a, b) => (a.priority - b.priority) || (a.timestamp - b.timestamp)
    );
  }
  
  clear() { 
    this.messages = []; 
    this.bytesSaved = 0; // Reset stats on clear
  }
  
  get length() { return this.messages.length; }
  get savedData() { return this.bytesSaved; }
}

module.exports = new NotificationQueue();