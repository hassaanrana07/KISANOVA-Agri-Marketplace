const pool = require('../config/db');
const { uploadMedia } = require('../services/storageService');
const socketService = require('../services/socketService');

/**
 * Get or Create Conversation
 * Initiated from product page or order
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { seller_id, product_id, order_id } = req.body;
    const buyerId = req.user.id;

    if (!seller_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: 'Seller ID and Product ID are required.'
      });
    }

    // Check if conversation already exists
    let query = 'SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND product_id = ?';
    const params = [buyerId, seller_id, product_id];

    if (order_id) {
      query += ' AND order_id = ?';
      params.push(order_id);
    } else {
      query += ' AND order_id IS NULL';
    }

    const [existing] = await pool.query(query, params);

    if (existing.length > 0) {
      return res.json({
        success: true,
        data: { conversation_id: existing[0].id }
      });
    }

    // Create new conversation
    const [result] = await pool.query(
      'INSERT INTO conversations (buyer_id, seller_id, product_id, order_id) VALUES (?, ?, ?, ?)',
      [buyerId, seller_id, product_id, order_id || null]
    );

    return res.status(201).json({
      success: true,
      data: { conversation_id: result.insertId }
    });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate conversation.' });
  }
};

/**
 * Get User's Conversations
 * Buyers see the Seller they are chatting with.
 * Sellers see the Buyer they are chatting with.
 */
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query = '';
    let params = [];

    if (role === 'SELLER') {
      const [sellers] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [userId]);
      if (sellers.length === 0) {
        return res.json({ success: true, data: [] });
      }
      const sellerId = sellers[0].id;

      query = `
        SELECT 
          c.id as conversation_id,
          c.created_at,
          c.updated_at,
          p.id as product_id,
          p.title as product_title,
          p.price as product_price,
          p.unit as product_unit,
          (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
          u.name as other_party_name,
          u.email as other_party_email,
          'BUYER' as other_party_role,
          (SELECT text_content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM conversations c
        JOIN products p ON c.product_id = p.id
        JOIN users u ON c.buyer_id = u.id
        WHERE c.seller_id = ?
        ORDER BY COALESCE(last_message_time, c.created_at) DESC
      `;
      params = [sellerId];
    } else {
      // BUYER view
      query = `
        SELECT 
          c.id as conversation_id,
          c.created_at,
          c.updated_at,
          p.id as product_id,
          p.title as product_title,
          p.price as product_price,
          p.unit as product_unit,
          (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
          s.farm_name as other_party_name,
          s.phone as other_party_phone,
          'SELLER' as other_party_role,
          (SELECT text_content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM conversations c
        JOIN products p ON c.product_id = p.id
        JOIN sellers s ON c.seller_id = s.id
        WHERE c.buyer_id = ?
        ORDER BY COALESCE(last_message_time, c.created_at) DESC
      `;
      params = [userId];
    }

    const [conversations] = await pool.query(query, params);

    return res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversations.' });
  }
};

/**
 * Get Messages in a Conversation
 * Validates membership: user must be either buyer or seller of the conversation (or admin)
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    // Check membership
    const [convs] = await pool.query(
      `SELECT c.*, s.user_id as seller_user_id, s.farm_name, u.name as buyer_name,
              p.title as product_title, p.price as product_price, p.unit as product_unit,
              (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image
       FROM conversations c
       JOIN sellers s ON c.seller_id = s.id
       JOIN users u ON c.buyer_id = u.id
       JOIN products p ON c.product_id = p.id
       WHERE c.id = ?`,
      [conversationId]
    );

    if (convs.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conv = convs[0];

    // Membership verification
    const isMember = (conv.buyer_id === userId) || (conv.seller_user_id === userId) || (role === 'ADMIN');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this conversation.'
      });
    }

    const [messages] = await pool.query(
      `SELECT 
         m.id, m.conversation_id, m.sender_id, m.message_type, m.text_content, m.media_url, m.created_at,
         u.name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    return res.json({
      success: true,
      data: {
        conversation: conv,
        messages
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

/**
 * Send Message (Text, Image, Video)
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text_content, message_type = 'TEXT' } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    // Check membership
    const [convs] = await pool.query(
      `SELECT c.*, s.user_id as seller_user_id 
       FROM conversations c
       JOIN sellers s ON c.seller_id = s.id
       WHERE c.id = ?`,
      [conversationId]
    );

    if (convs.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conv = convs[0];
    const isMember = (conv.buyer_id === userId) || (conv.seller_user_id === userId) || (role === 'ADMIN');
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot send messages to this conversation.'
      });
    }

    let mediaUrl = null;
    let finalMessageType = message_type;

    // Handle file upload
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video');
      finalMessageType = isVideo ? 'VIDEO' : 'IMAGE';
      const uploaded = await uploadMedia(req.file.path, {
        resource_type: isVideo ? 'video' : 'image',
        folder: 'kisanova_chat'
      });
      mediaUrl = uploaded.url;
    }

    if (!text_content && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain either text content or media attachment.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message_type, text_content, media_url)
       VALUES (?, ?, ?, ?, ?)`,
      [conversationId, userId, finalMessageType, text_content || null, mediaUrl]
    );

    // Update conversation timestamp
    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

    // Return created message with sender info
    const [newMessage] = await pool.query(
      `SELECT 
         m.id, m.conversation_id, m.sender_id, m.message_type, m.text_content, m.media_url, m.created_at,
         u.name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    // Real-time broadcast to conversation thread room
    socketService.emitToConversation(conversationId, 'new_message', newMessage[0]);

    // Also notify other participant directly if outside chat thread
    const recipientUserId = (userId === conv.buyer_id) ? conv.seller_user_id : conv.buyer_id;
    if (recipientUserId) {
      socketService.emitToUser(recipientUserId, 'new_chat_notification', {
        conversationId,
        senderName: newMessage[0].sender_name,
        textContent: text_content || (finalMessageType === 'IMAGE' ? 'Sent an image attachment' : 'Sent a file'),
        created_at: newMessage[0].created_at
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: newMessage[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage
};
