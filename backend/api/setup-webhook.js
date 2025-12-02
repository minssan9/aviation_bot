/**
 * Webhook Setup Helper
 *
 * This function helps set up the Telegram webhook for Vercel deployment.
 * Visit: https://your-app.vercel.app/api/setup-webhook?secret=YOUR_SECRET
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('../src/config');

module.exports = async (req, res) => {
  try {
    // Simple security check
    const secret = req.query.secret;
    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please provide valid secret in query parameter'
      });
    }

    const botConfig = config.getConfig();
    const bot = new TelegramBot(botConfig.BOT_TOKEN);

    // Get the deployment URL from environment or request
    const webhookUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhook`
      : req.headers.host
      ? `https://${req.headers.host}/api/webhook`
      : null;

    if (!webhookUrl) {
      return res.status(400).json({
        error: 'Cannot determine webhook URL',
        message: 'Please set VERCEL_URL environment variable or access via public URL'
      });
    }

    // Check current webhook
    const webhookInfo = await bot.getWebHookInfo();

    // Set webhook
    await bot.setWebHook(webhookUrl);

    // Verify webhook was set
    const newWebhookInfo = await bot.getWebHookInfo();

    res.status(200).json({
      success: true,
      message: 'Webhook configured successfully',
      previous: {
        url: webhookInfo.url,
        pending_updates: webhookInfo.pending_update_count
      },
      current: {
        url: newWebhookInfo.url,
        pending_updates: newWebhookInfo.pending_update_count,
        last_error: newWebhookInfo.last_error_message || 'None'
      }
    });

  } catch (error) {
    console.error('Webhook setup error:', error);
    res.status(500).json({
      error: 'Failed to set webhook',
      message: error.message
    });
  }
};
