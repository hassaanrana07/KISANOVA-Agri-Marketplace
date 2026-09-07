/**
 * Admin Endpoints Validation Schemas
 */

const updateSellerApprovalSchema = {
  approval_status: {
    type: 'string',
    enum: ['APPROVED', 'REJECTED', 'SUSPENDED'],
    required: true
  },
  rejection_reason: {
    type: 'string',
    max: 1000,
    required: false,
    custom: (val, req) => {
      if (req.body?.approval_status === 'REJECTED') {
        if (!val || typeof val !== 'string' || val.trim().length < 3) {
          return "Field 'rejection_reason' is required when rejecting a seller (min 3 characters).";
        }
      }
      return true;
    }
  }
};

const updateProductStatusSchema = {
  status: {
    type: 'string',
    enum: ['ACTIVE', 'INACTIVE', 'REJECTED', 'PENDING'],
    required: true
  }
};

const updateUserStatusSchema = {
  status: {
    type: 'string',
    enum: ['ACTIVE', 'SUSPENDED'],
    required: true
  }
};

const adminIdParamSchema = {
  id: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  updateSellerApprovalSchema,
  updateProductStatusSchema,
  updateUserStatusSchema,
  adminIdParamSchema
};
