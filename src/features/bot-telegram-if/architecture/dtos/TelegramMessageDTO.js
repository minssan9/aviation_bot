/**
 * Data Transfer Object for Telegram Message
 * Represents telegram message data structure for API responses
 */
class TelegramMessageDTO {
  constructor(data) {
    this.id = data.id;
    this.chatId = data.chat_id;
    this.messageId = data.message_id;
    this.userId = data.user_id;
    this.messageType = data.message_type;
    this.content = data.content;
    this.isBot = data.is_bot;
    this.timestamp = data.timestamp;
    this.replyToMessageId = data.reply_to_message_id;
    this.forwardFromChatId = data.forward_from_chat_id;
    this.entities = data.entities ? JSON.parse(data.entities) : [];
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create TelegramMessageDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {TelegramMessageDTO}
   */
  static fromDatabase(dbRow) {
    return new TelegramMessageDTO(dbRow);
  }

  /**
   * Create TelegramMessageDTO from Telegram message object
   * @param {Object} telegramMessage - Telegram message object
   * @param {number} userId - User ID
   * @returns {TelegramMessageDTO}
   */
  static fromTelegramMessage(telegramMessage, userId) {
    return new TelegramMessageDTO({
      id: null,
      chat_id: telegramMessage.chat.id,
      message_id: telegramMessage.message_id,
      user_id: userId,
      message_type: telegramMessage.text ? 'text' : 'other',
      content: telegramMessage.text || '',
      is_bot: telegramMessage.from.is_bot,
      timestamp: new Date(telegramMessage.date * 1000).toISOString(),
      reply_to_message_id: telegramMessage.reply_to_message?.message_id || null,
      forward_from_chat_id: telegramMessage.forward_from_chat?.id || null,
      entities: JSON.stringify(telegramMessage.entities || []),
      metadata: JSON.stringify({
        from: telegramMessage.from,
        chat: telegramMessage.chat,
        caption: telegramMessage.caption,
        photo: telegramMessage.photo,
        document: telegramMessage.document,
        sticker: telegramMessage.sticker,
        animation: telegramMessage.animation,
        video: telegramMessage.video,
        voice: telegramMessage.voice,
        video_note: telegramMessage.video_note,
        contact: telegramMessage.contact,
        location: telegramMessage.location,
        venue: telegramMessage.venue,
        poll: telegramMessage.poll,
        dice: telegramMessage.dice,
        new_chat_members: telegramMessage.new_chat_members,
        left_chat_member: telegramMessage.left_chat_member,
        new_chat_title: telegramMessage.new_chat_title,
        new_chat_photo: telegramMessage.new_chat_photo,
        delete_chat_photo: telegramMessage.delete_chat_photo,
        group_chat_created: telegramMessage.group_chat_created,
        supergroup_chat_created: telegramMessage.supergroup_chat_created,
        channel_chat_created: telegramMessage.channel_chat_created,
        migrate_to_chat_id: telegramMessage.migrate_to_chat_id,
        migrate_from_chat_id: telegramMessage.migrate_from_chat_id,
        pinned_message: telegramMessage.pinned_message,
        invoice: telegramMessage.invoice,
        successful_payment: telegramMessage.successful_payment,
        connected_website: telegramMessage.connected_website,
        passport_data: telegramMessage.passport_data,
        reply_markup: telegramMessage.reply_markup
      }),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      chatId: this.chatId,
      messageId: this.messageId,
      userId: this.userId,
      messageType: this.messageType,
      content: this.content,
      isBot: this.isBot,
      timestamp: this.timestamp,
      replyToMessageId: this.replyToMessageId,
      forwardFromChatId: this.forwardFromChatId,
      entities: this.entities,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate telegram message data
   * @param {Object} data - Telegram message data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validMessageTypes = ['text', 'photo', 'document', 'sticker', 'animation', 'video', 'voice', 'video_note', 'contact', 'location', 'venue', 'poll', 'dice', 'other'];

    if (!data.chatId || !Number.isInteger(data.chatId)) {
      errors.push('Chat ID is required and must be an integer');
    }

    if (!data.messageId || !Number.isInteger(data.messageId)) {
      errors.push('Message ID is required and must be an integer');
    }

    if (data.userId && (!Number.isInteger(data.userId) || data.userId <= 0)) {
      errors.push('User ID must be a positive integer');
    }

    if (data.messageType && !validMessageTypes.includes(data.messageType)) {
      errors.push(`Message type must be one of: ${validMessageTypes.join(', ')}`);
    }

    if (data.content && data.content.length > 4096) {
      errors.push('Content must be less than 4096 characters');
    }

    if (data.entities && !Array.isArray(data.entities)) {
      errors.push('Entities must be an array');
    }

    if (data.metadata && typeof data.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TelegramMessageDTO;
