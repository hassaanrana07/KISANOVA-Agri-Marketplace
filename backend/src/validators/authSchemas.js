/**
 * Authentication Endpoints Validation Schemas
 */

const registerSchema = {
  name: {
    type: 'string',
    min: 2,
    max: 100,
    required: true
  },
  email: {
    type: 'string',
    format: 'email',
    max: 255,
    required: true
  },
  password: {
    type: 'string',
    min: 6,
    max: 128,
    required: true
  },
  role: {
    type: 'string',
    enum: ['BUYER', 'SELLER'],
    required: true,
    custom: (role, req) => {
      if (role === 'SELLER') {
        if (!req.body?.farm_name || typeof req.body.farm_name !== 'string' || req.body.farm_name.trim().length < 2) {
          return "Field 'farm_name' is required for seller registration (min 2 characters).";
        }
        if (!req.body?.address || typeof req.body.address !== 'string' || req.body.address.trim().length < 3) {
          return "Field 'address' is required for seller registration (min 3 characters).";
        }
        if (!req.body?.phone || typeof req.body.phone !== 'string' || req.body.phone.trim().length < 7) {
          return "Field 'phone' is required for seller registration (min 7 characters).";
        }
      }
      return true;
    }
  },
  phone: {
    type: 'string',
    format: 'phone',
    min: 7,
    max: 25,
    required: false
  },
  farm_name: {
    type: 'string',
    min: 2,
    max: 200,
    required: false
  },
  address: {
    type: 'string',
    min: 3,
    max: 500,
    required: false
  },
  city: {
    type: 'string',
    max: 100,
    required: false
  },
  region: {
    type: 'string',
    max: 100,
    required: false
  },
  province: {
    type: 'string',
    max: 100,
    required: false
  },
  district: {
    type: 'string',
    max: 100,
    required: false
  },
  tehsil: {
    type: 'string',
    max: 100,
    required: false
  },
  village: {
    type: 'string',
    max: 100,
    required: false
  },
  latitude: {
    type: 'number',
    min: -90,
    max: 90,
    required: false
  },
  longitude: {
    type: 'number',
    min: -180,
    max: 180,
    required: false
  },
  seller_declared_area_acres: {
    type: 'number',
    min: 0,
    max: 100000,
    required: false
  },
  calculated_polygon_area_acres: {
    type: 'number',
    min: 0,
    max: 100000,
    required: false
  },
  farm_polygon: {
    required: false
  },
  logo_url: {
    type: 'string',
    max: 1000,
    required: false
  },
  business_info: {
    type: 'string',
    max: 2000,
    required: false
  },
  bio: {
    type: 'string',
    max: 2000,
    required: false
  }
};

const loginSchema = {
  email: {
    type: 'string',
    max: 255,
    required: false
  },
  identifier: {
    type: 'string',
    max: 255,
    required: false
  },
  password: {
    type: 'string',
    min: 1,
    max: 128,
    required: true,
    custom: (val, req) => {
      const email = req.body?.email || req.body?.identifier;
      if (!email || typeof email !== 'string' || email.trim() === '') {
        return "Email or identifier is required for login.";
      }
      return true;
    }
  },
  requestedRole: {
    type: 'string',
    enum: ['BUYER', 'SELLER', 'ADMIN'],
    required: false
  }
};

const verifyEmailBodySchema = {
  token: {
    type: 'string',
    min: 32,
    max: 128,
    required: true
  }
};

const verifyEmailQuerySchema = {
  token: {
    type: 'string',
    min: 32,
    max: 128,
    required: true
  }
};

const resendVerificationSchema = {
  email: {
    type: 'string',
    format: 'email',
    max: 255,
    required: true
  }
};

const forgotPasswordSchema = {
  email: {
    type: 'string',
    format: 'email',
    max: 255,
    required: true
  }
};

const resetPasswordSchema = {
  token: {
    type: 'string',
    min: 32,
    max: 128,
    required: true
  },
  newPassword: {
    type: 'string',
    min: 6,
    max: 128,
    required: false
  },
  password: {
    type: 'string',
    min: 6,
    max: 128,
    required: false,
    custom: (val, req) => {
      const pw = req.body?.newPassword || req.body?.password;
      if (!pw || typeof pw !== 'string' || pw.length < 6) {
        return "New password is required and must be at least 6 characters long.";
      }
      return true;
    }
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailBodySchema,
  verifyEmailQuerySchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
