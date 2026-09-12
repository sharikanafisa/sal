require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const bookingController = require('./controllers/bookingController');
const adminController = require('./controllers/adminController');
const whatsappService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 5000;
const ALT_PORT = 4200;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve Static Web Application
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../frontend/src')));

// Public Booking Routes
app.get('/api/bookings/available-slots', bookingController.getAvailableSlots);
app.post('/api/bookings', bookingController.createBooking);
app.get('/api/bookings/search', bookingController.searchBooking);
app.post('/api/bookings/:bookingId/cancel', bookingController.cancelBooking);

// Admin Routes
app.post('/api/admin/login', adminController.login);
app.get('/api/admin/dashboard-stats', adminController.verifyAdminToken, adminController.getDashboardStats);
app.get('/api/admin/appointments', adminController.verifyAdminToken, adminController.getAppointments);
app.patch('/api/admin/appointments/:bookingId/status', adminController.verifyAdminToken, adminController.updateAppointmentStatus);
app.get('/api/admin/slots', adminController.verifyAdminToken, adminController.getAdminSlots);
app.post('/api/admin/slots/toggle', adminController.verifyAdminToken, adminController.toggleSlotBlock);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Spider-Man Barber Booking API is live 🕷️' });
});

// SPA Fallback Handler
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Activate 24-Hour WhatsApp Reminder Background Scheduler
whatsappService.initReminderScheduler();

// Export express app for Vercel Serverless Functions
module.exports = app;

// Only start local standalone listeners if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🕷️ Barber Booking Application live at http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });

  const app4200 = express();
  app4200.use(app);
  app4200.listen(ALT_PORT, () => {
    console.log(`🕷️ Frontend Access live at http://localhost:${ALT_PORT}`);
  });
}
