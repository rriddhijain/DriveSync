// backend/state/queue.test.js
const queue = require('./queue');

describe('NotificationQueue', () => {
  beforeEach(() => {
    queue.clear();
    // Reset stats manually for test isolation
    queue.bytesSaved = 0;
    queue.bytesDelivered = 0;
    queue.deliveredCount = 0;
    queue.deferredCount = 0;
  });

  test('should push items and keep them sorted by priority ascending', () => {
    queue.push({ id: '1', absolutePriority: 3, timestamp: 1000 });
    queue.push({ id: '2', absolutePriority: 1, timestamp: 1100 });
    queue.push({ id: '3', absolutePriority: 2, timestamp: 1200 });

    const sorted = queue.getAllSorted();
    expect(sorted[0].id).toBe('2'); // Priority 1
    expect(sorted[1].id).toBe('3'); // Priority 2
    expect(sorted[2].id).toBe('1'); // Priority 3
  });

  test('should maintain FIFO (oldest first) order for items with the same priority', () => {
    queue.push({ id: '1', absolutePriority: 2, timestamp: 2000 }); // Newer
    queue.push({ id: '2', absolutePriority: 2, timestamp: 1000 }); // Older
    queue.push({ id: '3', absolutePriority: 2, timestamp: 1500 }); // Intermediate

    const sorted = queue.getAllSorted();
    expect(sorted[0].id).toBe('2'); // timestamp 1000
    expect(sorted[1].id).toBe('3'); // timestamp 1500
    expect(sorted[2].id).toBe('1'); // timestamp 2000
  });

  test('should track byte size and deferred counts correctly', () => {
    const msg = { text: 'hello' };
    const expectedSize = Buffer.byteLength(JSON.stringify(msg), 'utf8');

    queue.push(msg);
    expect(queue.length).toBe(1);
    expect(queue.savedData).toBe(expectedSize);
    expect(queue.stats.deferredCount).toBe(1);
  });

  test('should track live delivered statistics correctly', () => {
    const msg = { text: 'live message' };
    const expectedSize = Buffer.byteLength(JSON.stringify(msg), 'utf8');

    queue.trackDelivered(msg);
    expect(queue.length).toBe(0); // Delivered live, not queued
    expect(queue.stats.bytesDelivered).toBe(expectedSize);
    expect(queue.stats.deliveredCount).toBe(1);
  });

  test('should clear messages but retain accumulated metrics', () => {
    queue.push({ id: '1', absolutePriority: 2, timestamp: 1000 });
    expect(queue.length).toBe(1);
    
    queue.clear();
    expect(queue.length).toBe(0);
    expect(queue.stats.deferredCount).toBe(1); // Accumulated counter remains
  });
});
