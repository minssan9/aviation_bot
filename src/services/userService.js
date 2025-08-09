const MySQLDatabase = require('../database/mysqlDatabase');

class UserService {
  constructor(config) {
    this.db = new MySQLDatabase(config);
  }

  async initialize() {
    await this.db.initialize();
  }

  /**
   * Get database instance for other services
   */
  getDatabase() {
    return this.db;
  }

  /**
   * 사용자 등록/업데이트 (Telegram userData 기반)
   */
  async upsertUser(telegramData) {
    try {
      const {
        id: chatId,
        username = null,
        first_name = null,
        last_name = null,
        language_code = 'en'
      } = telegramData;

      const sql = `
        INSERT INTO users (id, username, first_name, last_name, language_code, is_subscribed, subscribed_at)
        VALUES (?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        language_code = VALUES(language_code),
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      `;

      const params = [chatId, username, first_name, last_name, language_code];
      const result = await this.db.execute(sql, params);
      
      console.log(`✅ User ${chatId} upserted successfully`);
      
      // 통계 업데이트
      await this.updateUserStats();
      
      return { chatId, isNew: result.affectedRows === 1 };
    } catch (error) {
      console.error('❌ Failed to upsert user:', error);
      throw error;
    }
  }

  /**
   * 사용자 구독
   */
  async subscribe(chatId, telegramData = null) {
    try {
      // 사용자 정보가 있으면 upsert 수행
      if (telegramData) {
        await this.upsertUser({ id: chatId, ...telegramData });
      }

      const sql = `
        INSERT INTO users (id, is_subscribed, subscribed_at) 
        VALUES (?, true, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
        is_subscribed = true,
        subscribed_at = CASE 
          WHEN is_subscribed = false THEN CURRENT_TIMESTAMP 
          ELSE subscribed_at 
        END,
        unsubscribed_at = NULL,
        last_activity = CURRENT_TIMESTAMP
      `;

      await this.db.execute(sql, [chatId]);
      
      const subscriberCount = await this.getSubscriberCount();
      console.log(`✅ User ${chatId} subscribed. Total: ${subscriberCount}`);
      
      // 통계 업데이트
      await this.updateUserStats();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe user:', error);
      throw error;
    }
  }

  /**
   * 사용자 구독 해제
   */
  async unsubscribe(chatId) {
    try {
      const sql = `
        UPDATE users 
        SET is_subscribed = false, 
            unsubscribed_at = CURRENT_TIMESTAMP,
            last_activity = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const result = await this.db.execute(sql, [chatId]);
      const unsubscribed = result.affectedRows > 0;
      
      if (unsubscribed) {
        const subscriberCount = await this.getSubscriberCount();
        console.log(`❌ User ${chatId} unsubscribed. Total: ${subscriberCount}`);
        
        // 통계 업데이트
        await this.updateUserStats();
      }
      
      return unsubscribed;
    } catch (error) {
      console.error('❌ Failed to unsubscribe user:', error);
      throw error;
    }
  }

  /**
   * 사용자 구독 상태 확인
   */
  async isSubscribed(chatId) {
    try {
      const sql = 'SELECT is_subscribed FROM users WHERE id = ?';
      const user = await this.db.get(sql, [chatId]);
      return user ? user.is_subscribed : false;
    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * 구독자 수 조회
   */
  async getSubscriberCount() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM users WHERE is_subscribed = true';
      const result = await this.db.get(sql);
      return result.count;
    } catch (error) {
      console.error('❌ Failed to get subscriber count:', error);
      return 0;
    }
  }

  /**
   * 모든 구독자 조회
   */
  async getAllSubscribers() {
    try {
      const sql = `
        SELECT id, username, first_name, language_code, subscribed_at, last_activity
        FROM users 
        WHERE is_subscribed = true 
        ORDER BY subscribed_at ASC
      `;
      const subscribers = await this.db.all(sql);
      return subscribers.map(user => ({
        chatId: user.id,
        username: user.username,
        firstName: user.first_name,
        language: user.language_code,
        subscribedAt: user.subscribed_at,
        lastActivity: user.last_activity
      }));
    } catch (error) {
      console.error('❌ Failed to get all subscribers:', error);
      return [];
    }
  }

  /**
   * 사용자 활동 업데이트
   */
  async updateActivity(chatId) {
    try {
      const sql = `
        UPDATE users 
        SET last_activity = CURRENT_TIMESTAMP, 
            total_messages_received = total_messages_received + 1
        WHERE id = ?
      `;
      await this.db.execute(sql, [chatId]);
    } catch (error) {
      console.warn('⚠️ Failed to update user activity:', error);
    }
  }

  /**
   * 메시지 전송 로그
   */
  async logMessage(chatId, messageType, options = {}) {
    try {
      const {
        contentHash = null,
        contentPreview = null,
        quizId = null,
        telegramMessageId = null,
        processingTimeMs = null,
        status = 'sent',
        errorMessage = null
      } = options;

      const sql = `
        INSERT INTO message_logs 
        (user_id, message_type, content_hash, content_preview, quiz_id, 
         telegram_message_id, processing_time_ms, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        chatId, messageType, contentHash, contentPreview, quizId,
        telegramMessageId, processingTimeMs, status, errorMessage
      ];

      await this.db.execute(sql, params);
      
      // 사용자 활동 업데이트
      if (status === 'sent') {
        await this.updateActivity(chatId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to log message:', error);
    }
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats() {
    try {
      const queries = {
        total: 'SELECT COUNT(*) as total FROM users',
        subscribed: 'SELECT COUNT(*) as subscribed FROM users WHERE is_subscribed = true',
        newToday: `
          SELECT COUNT(*) as new_today 
          FROM users 
          WHERE DATE(created_at) = CURDATE()
        `,
        activeThisWeek: `
          SELECT COUNT(*) as active_week 
          FROM users 
          WHERE last_activity >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `,
        byLanguage: `
          SELECT language_code, COUNT(*) as count 
          FROM users 
          GROUP BY language_code 
          ORDER BY count DESC
        `,
        messageStats: `
          SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT user_id) as users_messaged,
            AVG(processing_time_ms) as avg_processing_time
          FROM message_logs 
          WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `
      };

      const [total, subscribed, newToday, activeWeek, byLanguage, messageStats] = await Promise.all([
        this.db.get(queries.total),
        this.db.get(queries.subscribed),
        this.db.get(queries.newToday),
        this.db.get(queries.activeThisWeek),
        this.db.all(queries.byLanguage),
        this.db.get(queries.messageStats)
      ]);

      return {
        total: total.total,
        subscribed: subscribed.subscribed,
        newToday: newToday.new_today,
        activeThisWeek: activeWeek.active_week,
        byLanguage,
        messages24h: messageStats
      };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * 시스템 통계 업데이트
   */
  async updateUserStats() {
    try {
      const stats = await this.getUserStats();
      
      const updates = [
        ['total_users', stats.total.toString()],
        ['active_subscribers', stats.subscribed.toString()]
      ];

      for (const [metric, value] of updates) {
        await this.db.execute(
          `INSERT INTO system_stats (metric_name, metric_value, category) 
           VALUES (?, ?, 'users')
           ON DUPLICATE KEY UPDATE 
           metric_value = VALUES(metric_value), updated_at = CURRENT_TIMESTAMP`,
          [metric, value]
        );
      }
    } catch (error) {
      console.warn('⚠️ Failed to update user stats:', error);
    }
  }

  /**
   * Broadcast 기능 (기존 subscriberManager와 호환)
   */
  async broadcastToAll(callback) {
    try {
      const subscribers = await this.getAllSubscribers();
      console.log(`📢 Broadcasting to ${subscribers.length} MySQL subscribers`);
      
      for (const subscriber of subscribers) {
        try {
          await callback(subscriber.chatId);
        } catch (error) {
          console.error(`Failed to send message to ${subscriber.chatId}:`, error);
          
          // 실패한 메시지 로깅
          await this.logMessage(subscriber.chatId, 'broadcast', {
            status: 'failed',
            errorMessage: error.message
          });
        }
      }
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close() {
    await this.db.close();
  }

  /**
   * 데이터베이스 상태 조회
   */
  getStatus() {
    return this.db.getStats();
  }

  /**
   * 헬스 체크
   */
  async healthCheck() {
    return await this.db.healthCheck();
  }
}

module.exports = UserService;