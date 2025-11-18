import twilio from 'twilio';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class TwilioService {
  constructor() {
    this.client = null;
    this.initialized = false;

    if (config.twilio.accountSid && config.twilio.authToken) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.initialized = true;
      logger.info('Twilio service initialized');
    } else {
      logger.warn('Twilio credentials not configured');
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to, message) {
    try {
      if (!this.initialized) {
        throw new Error('Twilio not initialized');
      }

      const result = await this.client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to,
      });

      logger.info('SMS sent successfully', {
        to,
        sid: result.sid,
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber) {
    try {
      if (!this.initialized) {
        throw new Error('Twilio not initialized');
      }

      if (config.twilio.verifyServiceSid) {
        // Use Twilio Verify service
        const verification = await this.client.verify.v2
          .services(config.twilio.verifyServiceSid)
          .verifications.create({
            to: phoneNumber,
            channel: 'sms',
          });

        logger.info('Verification code sent', {
          phoneNumber,
          sid: verification.sid,
        });

        return {
          success: true,
          verificationId: verification.sid,
          status: verification.status,
        };
      } else {
        // Generate and send custom code
        const code = this.generateVerificationCode();
        const message = `Your SupportCarr verification code is: ${code}`;

        await this.sendSMS(phoneNumber, message);

        return {
          success: true,
          code, // In production, store this securely
        };
      }
    } catch (error) {
      logger.error('Failed to send verification code:', error);
      throw error;
    }
  }

  /**
   * Verify code
   */
  async verifyCode(phoneNumber, code) {
    try {
      if (!this.initialized) {
        throw new Error('Twilio not initialized');
      }

      if (config.twilio.verifyServiceSid) {
        const verificationCheck = await this.client.verify.v2
          .services(config.twilio.verifyServiceSid)
          .verificationChecks.create({
            to: phoneNumber,
            code,
          });

        logger.info('Verification check completed', {
          phoneNumber,
          status: verificationCheck.status,
        });

        return {
          success: verificationCheck.status === 'approved',
          status: verificationCheck.status,
        };
      } else {
        // Custom verification logic
        return {
          success: false,
          error: 'Custom verification not implemented',
        };
      }
    } catch (error) {
      logger.error('Failed to verify code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Make voice call
   */
  async makeCall(to, message) {
    try {
      if (!this.initialized) {
        throw new Error('Twilio not initialized');
      }

      const twiml = `<Response><Say>${message}</Say></Response>`;

      const call = await this.client.calls.create({
        twiml,
        to,
        from: config.twilio.phoneNumber,
      });

      logger.info('Call initiated', {
        to,
        sid: call.sid,
      });

      return {
        success: true,
        callId: call.sid,
        status: call.status,
      };
    } catch (error) {
      logger.error('Failed to make call:', error);
      throw error;
    }
  }

  /**
   * Send rescue dispatch SMS to driver
   */
  async sendRescueDispatchNotification(driverPhone, rescueDetails) {
    const { pickupAddress, riderPhone, distance, price } = rescueDetails;

    const message = `🚨 New rescue request!\n\nPickup: ${pickupAddress}\nDistance: ${distance} km\nPrice: $${price}\n\nRespond quickly to accept!`;

    return this.sendSMS(driverPhone, message);
  }

  /**
   * Send rescue status update to rider
   */
  async sendRescueStatusUpdate(riderPhone, status, driverName, estimatedTime) {
    let message = '';

    switch (status) {
      case 'accepted':
        message = `✅ ${driverName} accepted your rescue request! ETA: ${estimatedTime} min`;
        break;
      case 'driver_enroute':
        message = `🚗 ${driverName} is on the way! ETA: ${estimatedTime} min`;
        break;
      case 'driver_arrived':
        message = `📍 ${driverName} has arrived at your location!`;
        break;
      case 'completed':
        message = `✨ Rescue completed! Thanks for using SupportCarr!`;
        break;
      case 'cancelled':
        message = `❌ Your rescue request has been cancelled.`;
        break;
      default:
        message = `📱 Your rescue status: ${status}`;
    }

    return this.sendSMS(riderPhone, message);
  }

  /**
   * Generate 6-digit verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add +1 for US numbers if not present
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    return `+${cleaned}`;
  }
}

export default new TwilioService();
