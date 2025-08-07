const cron = require('node-cron');

class Scheduler {
  constructor(bot, subscriberManager, messageGenerator) {
    this.bot = bot;
    this.subscriberManager = subscriberManager;
    this.messageGenerator = messageGenerator;
    this.jobs = [];
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
      
      this.subscriberManager.broadcastToAll((chatId) => {
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
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