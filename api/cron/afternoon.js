/**
 * Vercel Cron Function - Afternoon Notification (2 PM KST)
 *
 * This function sends afternoon aviation knowledge messages to all subscribers.
 * Triggered by Vercel Cron at 2:00 PM KST (5:00 UTC)
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../src/config');
const AIProviderManager = require('../../src/providers/aiProvider');
const UserService = require('../../src/services/userService');
const TopicService = require('../../src/services/topicService');
const { AviationKnowledgeService, AviationKnowledgeManager } = require('../../src/services/aviationKnowledgeService');
const MessageGenerator = require('../../src/features/messageGenerator');

module.exports = async (req, res) => {
  try {
    // Verify this is a cron request
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('☀️ Starting afternoon notification...');

    const botConfig = config.getConfig();

    // Initialize bot (no polling)
    const bot = new TelegramBot(botConfig.BOT_TOKEN);

    // Initialize services
    const aiProvider = new AIProviderManager(botConfig);
    await aiProvider.initialize();

    const userService = new UserService(botConfig);
    await userService.initialize();

    const database = userService.getDatabase();
    const topicService = new TopicService(database);
    const aviationKnowledgeService = new AviationKnowledgeService(database, topicService);
    AviationKnowledgeManager.setInstance(aviationKnowledgeService);

    const messageGenerator = new MessageGenerator(aiProvider, aviationKnowledgeService);

    // Get all subscribers
    const subscribers = await userService.getSubscribers();
    console.log(`📤 Sending to ${subscribers.length} subscribers...`);

    // Generate afternoon message
    const message = await messageGenerator.generateMessage('afternoon');

    // Send to all subscribers
    const results = await Promise.allSettled(
      subscribers.map(async (subscriber) => {
        try {
          await bot.sendMessage(subscriber.chat_id, message, { parse_mode: 'Markdown' });
          return { chatId: subscriber.chat_id, success: true };
        } catch (error) {
          console.error(`Failed to send to ${subscriber.chat_id}:`, error.message);

          // If user blocked the bot, unsubscribe them
          if (error.response && error.response.statusCode === 403) {
            await userService.unsubscribe(subscriber.chat_id);
            console.log(`User ${subscriber.chat_id} blocked bot, unsubscribed`);
          }

          return { chatId: subscriber.chat_id, success: false, error: error.message };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`✅ Afternoon notifications sent: ${successful} successful, ${failed} failed`);

    // Cleanup
    await aiProvider.close();
    await userService.close();

    res.status(200).json({
      success: true,
      sent: successful,
      failed: failed,
      total: subscribers.length,
      timeSlot: 'afternoon'
    });

  } catch (error) {
    console.error('❌ Afternoon cron error:', error);
    res.status(500).json({ error: error.message });
  }
};
