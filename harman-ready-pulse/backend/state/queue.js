// backend/state/queue.js

class NotificationQueue {
  constructor() {
    this.messages = [];
    this.bytesSaved = 0;      // Bytes of deferred messages
    this.bytesDelivered = 0;   // Bytes of delivered messages
    this.deliveredCount = 0;   // Total messages delivered live
    this.deferredCount = 0;    // Total messages deferred to queue
  }
  
  push(msg) { 
    this.messages.push(msg); 
    const size = Buffer.byteLength(JSON.stringify(msg), 'utf8');
    this.bytesSaved += size;
    this.deferredCount++;
  }

  /** Track a delivered message's byte size (not queued, just counted) */
  trackDelivered(msg) {
    const size = Buffer.byteLength(JSON.stringify(msg), 'utf8');
    this.bytesDelivered += size;
    this.deliveredCount++;
  }
  
  /**
   * Sorting Engine: Priority first (ascending), then timestamp (oldest first).
   */
  getAllSorted() { 
    return [...this.messages].sort(
      (a, b) => (a.priority - b.priority) || (a.timestamp - b.timestamp)
    );
  }
  
  clear() { 
    this.messages = []; 
    this.bytesSaved = 0;
  }
  
  get length() { return this.messages.length; }
  get savedData() { return this.bytesSaved; }

  /** Full stats snapshot for the UI */
  get stats() {
    return {
      bytesSaved: this.bytesSaved,
      bytesDelivered: this.bytesDelivered,
      deliveredCount: this.deliveredCount,
      deferredCount: this.deferredCount,
      pendingCount: this.messages.length,
    };
  }
}

module.exports = new NotificationQueue();