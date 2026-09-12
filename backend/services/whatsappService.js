const db = require('../db/database');
const cron = require('node-cron');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    this.useTemplate = process.env.WHATSAPP_USE_TEMPLATE === 'true';
  }

  /**
   * Check if live Meta WhatsApp Cloud API credentials are model-ready
   */
  isConfigured() {
    return (
      this.token && 
      this.phoneNumberId && 
      !this.token.startsWith('mock_') && 
      !this.phoneNumberId.startsWith('mock_')
    );
  }

  /**
   * Normalize recipient phone number to E.164 digits without symbols (e.g. "+1 (555) 019-2831" -> "15550192831")
   */
  sanitizePhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  /**
   * Send WhatsApp confirmation after booking creation
   */
  async sendConfirmation(booking) {
    const formattedPhone = this.sanitizePhoneNumber(booking.whatsappNumber);

    if (this.useTemplate) {
      // Template Payload (For sending outside 24h window)
      const templatePayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'booking_confirmation',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: booking.customerName },
                { type: 'text', text: booking.bookingId },
                { type: 'text', text: booking.service },
                { type: 'text', text: booking.appointmentDate },
                { type: 'text', text: booking.appointmentTime }
              ]
            }
          ]
        }
      };
      return await this.dispatch(booking.bookingId, formattedPhone, 'confirmation', templatePayload);
    } else {
      // Standard Text Payload
      const messageText = `🕷️ *BOOKING CONFIRMED*

Hello *${booking.customerName}*, your appointment is successfully booked!

📋 *Booking Details:*
• *Booking ID:* ${booking.bookingId}
• *Service:* ${booking.service}
• *Date:* ${booking.appointmentDate}
• *Time:* ${booking.appointmentTime}

Thank you for choosing us! Reply to this message if you have any questions.`;

      const textPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      };

      return await this.dispatch(booking.bookingId, formattedPhone, 'confirmation', textPayload, messageText);
    }
  }

  /**
   * Send WhatsApp reminder 24 hours before appointment
   */
  async sendReminder(booking) {
    const formattedPhone = this.sanitizePhoneNumber(booking.whatsappNumber);
    const messageText = `⏰ *UPCOMING APPOINTMENT REMINDER*

Hi *${booking.customerName}*, this is a quick reminder for your appointment tomorrow!

📋 *Details:*
• *Booking ID:* ${booking.bookingId}
• *Service:* ${booking.service}
• *Date:* ${booking.appointmentDate}
• *Time:* ${booking.appointmentTime}

If you need to cancel or modify your slot, please visit the My Booking section on our website.`;

    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: { preview_url: false, body: messageText }
    };

    return await this.dispatch(booking.bookingId, formattedPhone, 'reminder', textPayload, messageText);
  }

  /**
   * Send cancellation notification
   */
  async sendCancellation(booking) {
    const formattedPhone = this.sanitizePhoneNumber(booking.whatsappNumber);
    const messageText = `❌ *BOOKING CANCELLED*

Hi *${booking.customerName}*, your appointment (ID: ${booking.bookingId}) on ${booking.appointmentDate} at ${booking.appointmentTime} has been cancelled.

The slot is now freed and available for re-booking anytime!`;

    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: { preview_url: false, body: messageText }
    };

    return await this.dispatch(booking.bookingId, formattedPhone, 'cancellation', textPayload, messageText);
  }

  /**
   * Dispatch message via Meta WhatsApp Business Cloud API or Dev Mock
   */
  async dispatch(bookingId, recipient, type, apiPayload, rawText = '') {
    try {
      if (!this.isConfigured()) {
        console.log(`\n================= WHATSAPP CLOUD API [DEV MOCK LOGGER] =================`);
        console.log(`STATUS: Credentials missing/mock mode active.`);
        console.log(`TO: ${recipient}`);
        console.log(`MESSAGE TYPE: ${type.toUpperCase()}`);
        console.log(`PAYLOAD:\n${JSON.stringify(apiPayload, null, 2)}`);
        console.log(`========================================================================\n`);

        db.prepare(`
          INSERT INTO whatsapp_logs (booking_id, recipient, type, payload, status)
          VALUES (?, ?, ?, ?, 'mock_sent')
        `).run(bookingId, recipient, type, JSON.stringify(apiPayload));

        return { success: true, mode: 'mock' };
      }

      // Live WhatsApp Business Cloud API Endpoint Call
      const endpoint = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });

      const responseData = await response.json();
      const status = response.ok ? 'sent' : 'failed';

      if (!response.ok) {
        console.error(`[WhatsApp API Error ${response.status}]`, responseData);
      } else {
        console.log(`[WhatsApp API Success] Message sent to ${recipient} (ID: ${responseData.messages?.[0]?.id})`);
      }

      db.prepare(`
        INSERT INTO whatsapp_logs (booking_id, recipient, type, payload, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(bookingId, recipient, type, JSON.stringify(responseData), status);

      return { success: response.ok, data: responseData };
    } catch (err) {
      console.error('[WhatsApp Service Dispatch Error]', err.message);
      db.prepare(`
        INSERT INTO whatsapp_logs (booking_id, recipient, type, payload, status)
        VALUES (?, ?, ?, ?, 'error')
      `).run(bookingId, recipient, type, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Initialize 24-hour reminder background scheduler
   */
  initReminderScheduler() {
    cron.schedule('*/15 * * * *', () => {
      try {
        const now = new Date();
        const targetDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const yyyy = targetDateObj.getFullYear();
        const mm = String(targetDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDateObj.getDate()).padStart(2, '0');
        const targetDateStr = `${yyyy}-${mm}-${dd}`;

        const upcomingBookings = db.prepare(`
          SELECT * FROM appointments 
          WHERE status = 'confirmed' 
            AND reminder_sent = 0 
            AND appointment_date = ?
        `).all(targetDateStr);

        for (const booking of upcomingBookings) {
          const mappedBooking = {
            bookingId: booking.booking_id,
            customerName: booking.customer_name,
            whatsappNumber: booking.whatsapp_number,
            service: booking.service,
            appointmentDate: booking.appointment_date,
            appointmentTime: booking.appointment_time
          };

          this.sendReminder(mappedBooking).then(res => {
            if (res.success) {
              db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(booking.id);
              console.log(`[Reminder Scheduler] Sent 24h WhatsApp reminder for Booking ${booking.booking_id}`);
            }
          });
        }
      } catch (err) {
        console.error('[Reminder Scheduler Error]', err.message);
      }
    });

    console.log('[WhatsApp Service] 24-Hour WhatsApp Reminder Scheduler active.');
  }
}

module.exports = new WhatsAppService();
