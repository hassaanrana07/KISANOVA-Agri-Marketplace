/**
 * Notification Endpoints Validation Schemas
 */

const notificationIdParamSchema = {
  id: {
    type: 'positiveInt',
    required: true
  }
};

const getNotificationsQuerySchema = {
  page: {
    type: 'positiveInt',
    min: 1,
    max: 1000,
    required: false
  },
  limit: {
    type: 'positiveInt',
    min: 1,
    max: 100,
    required: false
  },
  read: {
    type: 'boolean',
    required: false
  }
};

module.exports = {
  notificationIdParamSchema,
  getNotificationsQuerySchema
};
