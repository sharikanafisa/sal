const db = require('../db/database');
const whatsappService = require('../services/whatsappService');

// Standard daily barber operating time slots
const DEFAULT_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM'
];

/**
 * Generate unique Spider-Man themed booking ID (e.g. SP-48920)
 */
function generateBookingId() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `SP-${randomNum}`;
}

/**
 * Validate WhatsApp number format (E.164 or 10-15 digit string)
 */
function isValidWhatsApp(phone) {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/**
 * GET /api/bookings/available-slots?date=YYYY-MM-DD
 */
exports.getAvailableSlots = (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD)' });
    }

    // Get active bookings for date
    const bookedRows = db.prepare(`
      SELECT appointment_time FROM appointments 
      WHERE appointment_date = ? AND status != 'cancelled'
    `).all(date);
    const bookedTimes = new Set(bookedRows.map(r => r.appointment_time));

    // Get admin custom slot overrides/blockings for date
    const slotOverrides = db.prepare(`
      SELECT time, status FROM slots WHERE date = ?
    `).all(date);
    const blockedTimes = new Set(slotOverrides.filter(s => s.status === 'blocked').map(s => s.time));

    // Build slot list with status distinction
    const slots = DEFAULT_SLOTS.map(time => {
      let isBooked = bookedTimes.has(time);
      let isBlocked = blockedTimes.has(time);
      let isAvailable = !isBooked && !isBlocked;

      return {
        time,
        status: isBooked ? 'booked' : (isBlocked ? 'unavailable' : 'available'),
        isSelectable: isAvailable
      };
    });

    return res.json({ date, slots });
  } catch (err) {
    console.error('[getAvailableSlots Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve available slots' });
  }
};

/**
 * POST /api/bookings
 * Body: { customerName, whatsappNumber, email, service, appointmentDate, appointmentTime }
 */
exports.createBooking = (req, res) => {
  try {
    const { customerName, whatsappNumber, email, service, appointmentDate, appointmentTime } = req.body;

    // Strict Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Full Name is required' });
    }
    if (!whatsappNumber || !isValidWhatsApp(whatsappNumber)) {
      return res.status(400).json({ error: 'A valid WhatsApp phone number is required' });
    }
    if (!service || !['Haircut', 'Beard Trim', 'Haircut + Beard', 'Hair Styling'].includes(service)) {
      return res.status(400).json({ error: 'Please select a valid service' });
    }
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Date and time slot are required' });
    }

    // Ensure appointment date is not in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (appointmentDate < todayStr) {
      return res.status(400).json({ error: 'Cannot book an appointment for a past date' });
    }

    // Atomic DB Transaction for double-booking prevention
    const createTx = db.transaction(() => {
      // 1. Check if slot is blocked by admin
      const blocked = db.prepare(`
        SELECT id FROM slots WHERE date = ? AND time = ? AND status = 'blocked'
      `).get(appointmentDate, appointmentTime);
      if (blocked) {
        throw new Error('SLOT_BLOCKED');
      }

      // 2. Check if already booked
      const existing = db.prepare(`
        SELECT id FROM appointments 
        WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
      `).get(appointmentDate, appointmentTime);
      if (existing) {
        throw new Error('SLOT_BOOKED');
      }

      // 3. Create unique booking ID
      let bookingId = generateBookingId();
      let attempts = 0;
      while (db.prepare('SELECT id FROM appointments WHERE booking_id = ?').get(bookingId)) {
        bookingId = generateBookingId();
        attempts++;
        if (attempts > 10) throw new Error('ID_GEN_FAILED');
      }

      // 4. Insert booking
      const stmt = db.prepare(`
        INSERT INTO appointments 
        (booking_id, customer_name, whatsapp_number, email, service, appointment_date, appointment_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
      `);
      
      const result = stmt.run(
        bookingId,
        customerName.trim(),
        whatsappNumber.trim(),
        email ? email.trim() : null,
        service,
        appointmentDate,
        appointmentTime
      );

      return { id: result.lastInsertRowid, bookingId };
    });

    let bookingResult;
    try {
      bookingResult = createTx();
    } catch (txErr) {
      if (txErr.message === 'SLOT_BLOCKED') {
        return res.status(409).json({ error: 'This time slot is unavailable. Please select another slot.' });
      }
      if (txErr.message === 'SLOT_BOOKED' || txErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'This time slot has already been booked by another customer. Please choose a different slot.' });
      }
      throw txErr;
    }

    const newBooking = {
      bookingId: bookingResult.bookingId,
      customerName: customerName.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email ? email.trim() : null,
      service,
      appointmentDate,
      appointmentTime,
      status: 'confirmed'
    };

    // Trigger async WhatsApp confirmation
    whatsappService.sendConfirmation(newBooking);

    return res.status(201).json({
      message: 'Slot booked successfully!',
      booking: newBooking
    });
  } catch (err) {
    console.error('[createBooking Error]', err);
    return res.status(500).json({ error: 'An unexpected error occurred while confirming your slot' });
  }
};

/**
 * GET /api/bookings/search?query=...
 * Search by Booking ID (SP-XXXXX) OR WhatsApp number
 */
exports.searchBooking = (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Please enter a Booking ID or WhatsApp number' });
    }

    const cleanQuery = query.trim();
    const cleanDigits = cleanQuery.replace(/\D/g, '');

    const bookings = db.prepare(`
      SELECT 
        booking_id as bookingId,
        customer_name as customerName,
        whatsapp_number as whatsappNumber,
        email,
        service,
        appointment_date as appointmentDate,
        appointment_time as appointmentTime,
        status,
        created_at as createdAt
      FROM appointments 
      WHERE UPPER(booking_id) = UPPER(?) 
         OR whatsapp_number LIKE ?
      ORDER BY appointment_date DESC, appointment_time DESC
    `).all(cleanQuery, `%${cleanDigits || cleanQuery}%`);

    return res.json({ bookings });
  } catch (err) {
    console.error('[searchBooking Error]', err);
    return res.status(500).json({ error: 'Failed to search booking' });
  }
};

/**
 * POST /api/bookings/:bookingId/cancel
 */
exports.cancelBooking = (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = db.prepare(`
      SELECT 
        booking_id as bookingId,
        customer_name as customerName,
        whatsapp_number as whatsappNumber,
        service,
        appointment_date as appointmentDate,
        appointment_time as appointmentTime,
        status
      FROM appointments 
      WHERE UPPER(booking_id) = UPPER(?)
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This appointment is already cancelled' });
    }

    db.prepare(`
      UPDATE appointments SET status = 'cancelled' WHERE UPPER(booking_id) = UPPER(?)
    `).run(bookingId);

    // Send WhatsApp cancellation notification
    whatsappService.sendCancellation(booking);

    return res.json({
      message: 'Appointment successfully cancelled. Slot is now available again.',
      bookingId
    });
  } catch (err) {
    console.error('[cancelBooking Error]', err);
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};
