const cron = require('node-cron');

class Scheduler {
  constructor(bot, subscriberManager, messageGenerator) {
    this.bot = bot;
    this.subscriberManager = subscriberManager;
    this.messageGenerator = messageGenerator;
    this.jobs = [];
  }

  /**
   * Markdown을 HTML로 변환
   */
  convertToHtml(text) {
    if (!text) return text;
    
    let html = text;
    
    // **bold** -> <b>bold</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // *italic* -> <i>italic</i>
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    
    // `code` -> <code>code</code>
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // [text](url) -> <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    return html;
  }

  /**
   * 메시지를 안전하게 전송 (Markdown 파싱 오류 방지)
   */
  async sendSafeMessage(chatId, message) {
    try {
      // HTML 태그로 변환
      const htmlMessage = this.convertToHtml(message);
      
      return await this.bot.sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Message sending failed, trying without parse mode:', error);
      
      // HTML 파싱 실패시 일반 텍스트로 재시도
      try {
        return await this.bot.sendMessage(chatId, message, { parse_mode: undefined });
      } catch (secondError) {
        console.error('Second attempt failed:', secondError);
        // 최후의 수단: 메시지를 분할하여 전송
        return await this.sendSplitMessage(chatId, message);
      }
    }
  }

  /**
   * 긴 메시지를 분할하여 전송
   */
  async sendSplitMessage(chatId, message) {
    const maxLength = 4000; // Telegram 메시지 최대 길이
    
    if (message.length <= maxLength) {
      return await this.bot.sendMessage(chatId, message);
    }
    
    // 메시지를 줄 단위로 분할
    const lines = message.split('\n');
    let currentMessage = '';
    const messages = [];
    
    for (const line of lines) {
      if ((currentMessage + line + '\n').length > maxLength) {
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim());
        }
        currentMessage = line + '\n';
      } else {
        currentMessage += line + '\n';
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    // 분할된 메시지들을 순차적으로 전송
    const results = [];
    for (const msg of messages) {
      try {
        const result = await this.bot.sendMessage(chatId, msg);
        results.push(result);
      } catch (error) {
        console.error('Failed to send split message part:', error);
      }
    }
    
    return results[0]; // 첫 번째 메시지 결과 반환
  }

  start() {
    console.log('📅 스케줄러 시작: 오전 9시, 오후 2시, 저녁 8시 (KST)');
    
    // 오전 9시 알림
    const morningJob = cron.schedule('0 9 * * *', async () => {
      await this.sendScheduledMessage('morning');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 오후 2시 알림  
    const afternoonJob = cron.schedule('0 14 * * *', async () => {
      await this.sendScheduledMessage('afternoon');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 저녁 8시 알림
    const eveningJob = cron.schedule('0 20 * * *', async () => {
      await this.sendScheduledMessage('evening');
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    this.jobs.push(
      { name: 'morning', job: morningJob },
      { name: 'afternoon', job: afternoonJob },
      { name: 'evening', job: eveningJob }
    );

    // Start all jobs
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ ${name} 스케줄 활성화됨`);
    });
  }

  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️ ${name} 스케줄 중지됨`);
    });
    console.log('📅 모든 스케줄이 중지되었습니다');
  }

  async sendScheduledMessage(timeSlot) {
    try {
      console.log(`📢 ${timeSlot} 예정 알림 시작`);
      const message = await this.messageGenerator.generateMessage(timeSlot);
      
      this.subscriberManager.broadcastToAll(async (chatId) => {
        await this.sendSafeMessage(chatId, message);
      });
      
      console.log(`✅ ${timeSlot} 알림 완료`);
    } catch (error) {
      console.error(`❌ ${timeSlot} 알림 오류:`, error);
    }
  }

  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      isRunning: job.running
    }));
  }
}

module.exports = Scheduler;