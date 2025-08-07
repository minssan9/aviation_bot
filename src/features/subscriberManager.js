class SubscriberManager {
  constructor() {
    // In production, this should be a database
    this.subscribers = new Set();
  }

  subscribe(chatId) {
    this.subscribers.add(chatId);
    console.log(`✅ User ${chatId} subscribed. Total: ${this.subscribers.size}`);
    return true;
  }

  unsubscribe(chatId) {
    const removed = this.subscribers.delete(chatId);
    if (removed) {
      console.log(`❌ User ${chatId} unsubscribed. Total: ${this.subscribers.size}`);
    }
    return removed;
  }

  isSubscribed(chatId) {
    return this.subscribers.has(chatId);
  }

  getSubscriberCount() {
    return this.subscribers.size;
  }

  getAllSubscribers() {
    return Array.from(this.subscribers);
  }

  broadcastToAll(callback) {
    const subscribers = this.getAllSubscribers();
    console.log(`📢 Broadcasting to ${subscribers.length} subscribers`);
    
    subscribers.forEach(chatId => {
      try {
        callback(chatId);
      } catch (error) {
        console.error(`Failed to send message to ${chatId}:`, error);
      }
    });
  }

  // Future: implement database persistence
  // async saveToDatabase() { }
  // async loadFromDatabase() { }
}

module.exports = SubscriberManager;