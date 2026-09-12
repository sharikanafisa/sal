const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'spiderman_barber_super_secret_jwt_key_2026!';
const DEFAULT_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM'
];

/**
 * Middleware: Verify Admin JWT Token
 */
exports.verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

/**
 * POST /api/admin/login
 */
exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const validPassword = bcrypt.compareSync(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ message: 'Login successful', token, username: admin.username });
  } catch (err) {
    console.error('[Admin Login Error]', err);
    return res.status(500).json({ error: 'Login failed due to a server error' });
  }
};

/**
 * GET /api/admin/dashboard-stats
 */
exports.getDashboardStats = (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayBookingsCount = db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE appointment_date = ? AND status != 'cancelled'
    `).get(todayStr).count;

    const upcomingBookingsCount = db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE appointment_date > ? AND status = 'confirmed'
    `).get(todayStr).count;

    const totalBookingsCount = db.prepare(`
      SELECT COUNT(*) as count FROM appointments
    `).get().count;

    // Available slots calculation for today
    const bookedToday = db.prepare(`
      SELECT appointment_time FROM appointments 
      WHERE appointment_date = ? AND status != 'cancelled'
    `).all(todayStr).map(r => r.appointment_time);

    const blockedToday = db.prepare(`
      SELECT time FROM slots WHERE date = ? AND status = 'blocked'
    `).all(todayStr).map(r => r.time);

    const unavailableSet = new Set([...bookedToday, ...blockedToday]);
    const availableSlotsTodayCount = DEFAULT_SLOTS.filter(s => !unavailableSet.has(s)).length;

    return res.json({
      todayBookings: todayBookingsCount,
      upcomingBookings: upcomingBookingsCount,
      totalBookings: totalBookingsCount,
      availableSlotsToday: availableSlotsTodayCount
    });
  } catch (err) {
    console.error('[getDashboardStats Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
};

/**
 * GET /api/admin/appointments?date=...&status=...
 */
exports.getAppointments = (req, res) => {
  try {
    const { date, status } = req.query;

    let query = `
      SELECT 
        id,
        booking_id as bookingId,
        customer_name as customerName,
        whatsapp_number as whatsappNumber,
        email,
        service,
        appointment_date as appointmentDate,
        appointment_time as appointmentTime,
        status,
        created_at as createdAt
      FROM appointments WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND appointment_date = ?`;
      params.push(date);
    }
    if (status && ['confirmed', 'completed', 'cancelled'].includes(status)) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY appointment_date DESC, appointment_time ASC`;

    const appointments = db.prepare(query).all(...params);
    return res.json({ appointments });
  } catch (err) {
    console.error('[getAppointments Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
};

/**
 * PATCH /api/admin/appointments/:bookingId/status
 * Body: { status: 'completed' | 'cancelled' | 'confirmed' }
 */
exports.updateAppointmentStatus = (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid appointment status' });
    }

    const booking = db.prepare('SELECT * FROM appointments WHERE booking_id = ?').get(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    db.prepare('UPDATE appointments SET status = ? WHERE booking_id = ?').run(status, bookingId);

    return res.json({ message: `Appointment status updated to ${status}`, bookingId, status });
  } catch (err) {
    console.error('[updateAppointmentStatus Error]', err);
    return res.status(500).json({ error: 'Failed to update appointment status' });
  }
};

/**
 * GET /api/admin/slots?date=YYYY-MM-DD
 */
exports.getAdminSlots = (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    const bookedRows = db.prepare(`
      SELECT appointment_time, booking_id, customer_name FROM appointments 
      WHERE appointment_date = ? AND status != 'cancelled'
    `).all(date);
    const bookedMap = new Map();
    bookedRows.forEach(r => bookedMap.set(r.appointment_time, r));

    const slotOverrides = db.prepare(`
      SELECT time, status FROM slots WHERE date = ?
    `).all(date);
    const blockedTimes = new Set(slotOverrides.filter(s => s.status === 'blocked').map(s => s.time));

    const slots = DEFAULT_SLOTS.map(time => {
      const bookingInfo = bookedMap.get(time);
      const isBlocked = blockedTimes.has(time);

      return {
        time,
        status: bookingInfo ? 'booked' : (isBlocked ? 'blocked' : 'available'),
        bookingId: bookingInfo ? bookingInfo.booking_id : null,
        customerName: bookingInfo ? bookingInfo.customer_name : null
      };
    });

    return res.json({ date, slots });
  } catch (err) {
    console.error('[getAdminSlots Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve admin slots' });
  }
};

/**
 * POST /api/admin/slots/toggle
 * Body: { date, time, action: 'block' | 'unblock' }
 */
exports.toggleSlotBlock = (req, res) => {
  try {
    const { date, time, action } = req.body;
    if (!date || !time || !['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'Valid date, time, and action (block/unblock) required' });
    }

    if (action === 'block') {
      db.prepare(`
        INSERT INTO slots (date, time, status) VALUES (?, ?, 'blocked')
        ON CONFLICT(date, time) DO UPDATE SET status = 'blocked'
      `).run(date, time);
    } else {
      db.prepare(`
        DELETE FROM slots WHERE date = ? AND time = ?
      `).run(date, time);
    }

    return res.json({ message: `Slot ${time} on ${date} is now ${action === 'block' ? 'blocked' : 'available'}`, date, time, action });
  } catch (err) {
    console.error('[toggleSlotBlock Error]', err);
    return res.status(500).json({ error: 'Failed to update slot status' });
  }
};
