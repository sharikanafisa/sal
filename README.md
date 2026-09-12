# 💈 Barber Slot - Spider-Man High-Contrast Barber Appointment Platform

A high-contrast Spider-Man themed appointment booking platform built for a single-barber shop. Features instant slot locking, SQLite database concurrency protection, WhatsApp Cloud API notification framework, and a private Barber Admin Portal.

---

## ✨ Features

- **Instant 4-Step Booking Flow**:
  1. Select Service (Haircut, Beard Trim, Haircut + Beard, Hair Styling)
  2. Choose Date & Available 30-min Time Slot
  3. Enter Customer Details (Name, WhatsApp Number, Email)
  4. Confirm & Receive Booking ID
- **Spider-Man Dark UI Theme**:
  - Real-time animated **Interactive Spider-Web Canvas** background reacting to cursor movements.
  - High-contrast Void Black (`#020205`) background with Obsidian Glass panels & neon laser borders (`#FF003B` / `#00F0FF`).
  - 100% white crisp text contrast & suit mesh overlays.
- **Race Condition & Double-Booking Protection**:
  - Backend powered by SQLite WAL mode and synchronous database transactions with partial unique indexes on active appointments.
- **WhatsApp Cloud API Integration**:
  - Meta v20.0 Graph API integration with automatic E.164 phone sanitization, development mock fallback, and a 24-hour reminder background scheduler (`node-cron`).
- **My Booking Portal**:
  - Customers can search & manage existing appointments using Booking ID or WhatsApp number.
- **Barber Admin Dashboard**:
  - Password-protected portal (`admin` / `admin123`) to view live appointments and manage schedule.

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Application
```bash
node server.js
```
The application will be live at:
- **`http://localhost:5000`**
- **`http://localhost:4200`**

---

## 📱 Meta WhatsApp Cloud API Setup

To enable live WhatsApp messages to customers:
1. Register at [developers.facebook.com](https://developers.facebook.com) and create a Meta WhatsApp app.
2. Add a phone number in the Meta Developer Portal and generate a Permanent User Access Token.
3. Update your `.env` file with your credentials:
   ```env
   WHATSAPP_TOKEN=your_live_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
   ```

---

## 🔒 Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`
