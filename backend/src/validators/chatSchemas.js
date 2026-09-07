/**
 * Chat Endpoints Validation Schemas
 */

const createConversationSchema = {
  seller_id: {
    type: 'positiveInt',
    required: true
  },
  product_id: {
    type: 'positiveInt',
    required: true
  },
  order_id: {
    type: 'positiveInt',
    required: false
  }
};

const sendMessageSchema = {
  content: {
    type: 'string',
    max: 5000,
    required: false,
    custom: (val, req) => {
      // Must have either text content or an uploaded file
      const hasText = val && typeof val === 'string' && val.trim().length > 0;
      const hasFile = req.file !== undefined && req.file !== null;
      if (!hasText && !hasFile) {
        return "Message content or an attached media file is required.";
      }
      return true;
    }
  }
};

const conversationIdParamSchema = {
  conversationId: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema
};
