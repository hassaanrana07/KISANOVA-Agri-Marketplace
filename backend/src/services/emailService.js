/**
 * Centralized Email Service for Kisanova Agri Marketplace
 * Uses Brevo Transactional Email API (v3/smtp/email)
 */

class EmailService {
  constructor() {
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  getApiKey() {
    const key = process.env.BREVO_API_KEY;
    if (!key || !key.trim()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL CONFIGURATION ERROR: BREVO_API_KEY environment variable is required in production.');
      }
      return null;
    }
    return key.trim();
  }

  getSender() {
    return {
      email: process.env.BREVO_SENDER_EMAIL || 'hassaanrana429@gmail.com',
      name: process.env.BREVO_SENDER_NAME || 'Kisanova'
    };
  }

  getBaseUrl(role = 'BUYER') {
    if (role === 'SELLER') {
      return process.env.SELLER_APP_URL || 'http://localhost:5140';
    }
    return process.env.PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:5000';
  }

  /**
   * Build HTML Email Template for Email Verification
   */
  buildVerificationHtml({ name, verificationUrl }) {
    const displayName = name || 'Valued Farmer / Buyer';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Kisanova email address</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #16a34a; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; color: #dcfce7; font-size: 13px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 36px 32px; color: #334155; line-height: 1.6; font-size: 15px; }
    .salutation { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3); }
    .link-box { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px; color: #475569; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .warning { color: #dc2626; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>KISANOVA</h1>
      <p>Agricultural Marketplace</p>
    </div>
    <div class="body">
      <div class="salutation">Welcome to Kisanova, ${displayName}!</div>
      <p>Thank you for registering on Pakistan's direct farmer-to-buyer agricultural marketplace. Please verify your email address to activate your account and access the marketplace.</p>
      
      <div class="button-container">
        <a href="${verificationUrl}" class="button" target="_blank">Verify Email Address</a>
      </div>

      <p>This verification link expires in <span class="warning">30 minutes</span>.</p>
      <p>If the button above does not work, copy and paste this verification URL into your web browser:</p>
      <div class="link-box">${verificationUrl}</div>

      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">If you did not create an account on Kisanova, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Kisanova Agricultural Marketplace. Direct Farm-to-Buyer Trading.
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Send Email Verification Link via Brevo
   */
  async sendVerificationEmail({ toEmail, toName, rawToken, role = 'BUYER' }) {
    const apiKey = this.getApiKey();
    const sender = this.getSender();
    const baseUrl = this.getBaseUrl(role);
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    // Mock bypass for test environment when apiKey is omitted or during testing
    if (!apiKey) {
      console.log(`[EmailService] Local/Dev mode: Verification email queued for ${toEmail}. Link: ${verificationUrl}`);
      return { success: true, isMock: true, verificationUrl };
    }

    const payload = {
      sender,
      to: [
        {
          email: toEmail,
          name: toName || 'Kisanova User'
        }
      ],
      subject: 'Verify your Kisanova email address',
      htmlContent: this.buildVerificationHtml({ name: toName, verificationUrl }),
      textContent: `Welcome to Kisanova! Please verify your email address by visiting this link: ${verificationUrl}\n\nThis verification link expires in 30 minutes.\nIf you did not create this account, you can safely ignore this email.`
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('[EmailService] Brevo API rejection:', response.status, data.message || response.statusText);
        return {
          success: false,
          error: data.message || `Brevo request failed with status ${response.status}`
        };
      }

      return {
        success: true,
        messageId: data.messageId
      };
    } catch (err) {
      console.error('[EmailService] Failed to dispatch email via Brevo:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = new EmailService();
