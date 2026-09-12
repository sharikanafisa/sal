import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, DashboardStats, Booking, TimeSlot } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-wrapper">
      <div class="container">

        <!-- ADMIN LOGIN SCREEN (If not authenticated) -->
        <div *ngIf="!isLoggedIn" class="login-box glass-panel">
          <div class="login-header">
            <div class="admin-emblem">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff1e43" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h2>BARBER PORTAL LOGIN</h2>
            <p>Private admin area for appointment & slot management.</p>
          </div>

          <form (submit)="handleLogin($event)" class="login-form">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input 
                type="text" 
                class="form-input" 
                placeholder="Admin username" 
                [(ngModel)]="loginUsername" 
                name="username"
                required>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input 
                type="password" 
                class="form-input" 
                placeholder="••••••••" 
                [(ngModel)]="loginPassword" 
                name="password"
                required>
            </div>

            <div *ngIf="loginError" class="login-error">
              ⚠️ {{ loginError }}
            </div>

            <button type="submit" class="btn-spider login-btn" [disabled]="isLoggingIn">
              <span *ngIf="!isLoggingIn">LOG IN TO DASHBOARD</span>
              <span *ngIf="isLoggingIn" class="mini-spinner"></span>
            </button>

            <div class="demo-credentials-note">
              Default Barber Credentials: <code>admin</code> / <code>admin123</code>
            </div>
          </form>
        </div>

        <!-- AUTHENTICATED ADMIN DASHBOARD -->
        <div *ngIf="isLoggedIn" class="dashboard-content">
          
          <!-- Top Bar -->
          <div class="dash-top-bar">
            <div class="barber-status">
              <span class="pulse-green"></span>
              <span>Logged in as <strong>{{ adminUsername }}</strong></span>
            </div>

            <button class="btn-secondary logout-btn" (click)="handleLogout()">
              Logout
            </button>
          </div>

          <!-- Section Navigation Tabs -->
          <div class="dash-tabs">
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'overview'" 
              (click)="activeTab = 'overview'">
              📊 Dashboard Overview
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'appointments'" 
              (click)="activeTab = 'appointments'; fetchAppointments()">
              📋 Appointments List
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'slots'" 
              (click)="activeTab = 'slots'; fetchAdminSlots()">
              ⏰ Slot Management
            </button>
          </div>

          <!-- TAB 1: OVERVIEW METRICS -->
          <section *ngIf="activeTab === 'overview'" class="tab-section">
            <div class="stats-grid">
              <div class="stat-card glass-panel red-glow">
                <span class="stat-title">TODAY'S BOOKINGS</span>
                <span class="stat-value">{{ stats?.todayBookings || 0 }}</span>
                <span class="stat-subtitle">Scheduled for today</span>
              </div>

              <div class="stat-card glass-panel">
                <span class="stat-title">UPCOMING</span>
                <span class="stat-value">{{ stats?.upcomingBookings || 0 }}</span>
                <span class="stat-subtitle">Future confirmed slots</span>
              </div>

              <div class="stat-card glass-panel">
                <span class="stat-title">SLOTS TODAY</span>
                <span class="stat-value">{{ stats?.availableSlotsToday || 0 }}</span>
                <span class="stat-subtitle">Available to book</span>
              </div>

              <div class="stat-card glass-panel">
                <span class="stat-title">TOTAL BOOKINGS</span>
                <span class="stat-value">{{ stats?.totalBookings || 0 }}</span>
                <span class="stat-subtitle">All time reservations</span>
              </div>
            </div>

            <!-- Quick Action Today's Schedule -->
            <div class="today-schedule-box glass-panel">
              <div class="panel-header">
                <h3>Today's Appointments</h3>
                <button class="btn-secondary btn-sm" (click)="fetchAppointments(todayDateStr)">Refresh</button>
              </div>

              <div *ngIf="todayAppointments.length === 0" class="empty-list">
                No appointments scheduled for today yet.
              </div>

              <div *ngIf="todayAppointments.length > 0" class="today-list">
                <div *ngFor="let a of todayAppointments" class="today-item">
                  <div class="today-time">{{ a.appointmentTime }}</div>
                  <div class="today-details">
                    <strong>{{ a.customerName }}</strong>
                    <span>{{ a.service }} • {{ a.whatsappNumber }}</span>
                  </div>
                  <span class="badge" [class]="'badge-' + a.status">{{ a.status }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- TAB 2: APPOINTMENTS MANAGEMENT -->
          <section *ngIf="activeTab === 'appointments'" class="tab-section">
            <div class="filter-bar glass-panel">
              <div class="filter-group">
                <label>Filter Date:</label>
                <input type="date" class="form-input date-input" [(ngModel)]="filterDate" (change)="fetchAppointments()">
              </div>

              <div class="filter-group">
                <label>Filter Status:</label>
                <select class="form-input select-input" [(ngModel)]="filterStatus" (change)="fetchAppointments()">
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="appointments-table-container glass-panel">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer Name</th>
                    <th>WhatsApp</th>
                    <th>Service</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let appt of appointments">
                    <td><strong class="code-id">{{ appt.bookingId }}</strong></td>
                    <td>{{ appt.customerName }}</td>
                    <td>{{ appt.whatsappNumber }}</td>
                    <td><span class="highlight-red">{{ appt.service }}</span></td>
                    <td>{{ appt.appointmentDate }} <br><small class="text-muted">{{ appt.appointmentTime }}</small></td>
                    <td>
                      <span class="badge" [class]="'badge-' + appt.status">{{ appt.status }}</span>
                    </td>
                    <td>
                      <div class="action-buttons" *ngIf="appt.status === 'confirmed'">
                        <button class="btn-action complete" (click)="updateStatus(appt.bookingId, 'completed')">
                          ✓ Complete
                        </button>
                        <button class="btn-action cancel" (click)="updateStatus(appt.bookingId, 'cancelled')">
                          ✕ Cancel
                        </button>
                      </div>
                      <span *ngIf="appt.status !== 'confirmed'" class="text-dim">—</span>
                    </td>
                  </tr>
                  <tr *ngIf="appointments.length === 0">
                    <td colspan="7" class="text-center">No appointments matching selected filters.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- TAB 3: SLOT MANAGEMENT (BLOCK / UNBLOCK SLOTS) -->
          <section *ngIf="activeTab === 'slots'" class="tab-section">
            <div class="slot-manager-header glass-panel">
              <div class="date-picker-group">
                <label class="form-label">Manage Slots For Date:</label>
                <input type="date" class="form-input date-input" [(ngModel)]="slotManagerDate" (change)="fetchAdminSlots()">
              </div>
              <p class="manager-desc">
                Click on any slot to <strong>Block</strong> or <strong>Unblock</strong> it. Blocked slots immediately become unavailable for customer booking.
              </p>
            </div>

            <div class="admin-slots-grid glass-panel">
              <div 
                *ngFor="let s of adminSlots" 
                class="admin-slot-card"
                [class.slot-available]="s.status === 'available'"
                [class.slot-booked]="s.status === 'booked'"
                [class.slot-blocked]="s.status === 'blocked'"
                (click)="toggleSlot(s)">
                
                <div class="slot-time">{{ s.time }}</div>
                
                <div class="slot-state">
                  <span *ngIf="s.status === 'available'" class="state-badge available">● Available</span>
                  <span *ngIf="s.status === 'booked'" class="state-badge booked">🔒 Booked ({{ s.customerName }})</span>
                  <span *ngIf="s.status === 'blocked'" class="state-badge blocked">⛔ Blocked by Admin</span>
                </div>

                <div class="slot-hover-hint" *ngIf="s.status !== 'booked'">
                  {{ s.status === 'blocked' ? 'Click to Unblock' : 'Click to Block' }}
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  `,
  styles: [`
    .admin-wrapper {
      padding: 40px 16px 80px 16px;
      min-height: calc(100vh - 70px);
    }
    .container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Login Modal */
    .login-box {
      max-width: 440px;
      margin: 40px auto;
      padding: 36px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .admin-emblem {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      background: rgba(255, 30, 67, 0.15);
      border: 1px solid rgba(255, 30, 67, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px auto;
    }
    .login-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .login-header p {
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .login-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 18px;
      font-size: 0.85rem;
    }
    .login-btn {
      margin-top: 10px;
    }
    .demo-credentials-note {
      margin-top: 20px;
      font-size: 0.8rem;
      color: #64748b;
      text-align: center;
    }
    .demo-credentials-note code {
      color: #ff1e43;
      background: rgba(255, 30, 67, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Dashboard Top Bar */
    .dash-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .barber-status {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      color: #94a3b8;
    }
    .pulse-green {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }
    .logout-btn {
      padding: 6px 16px;
      font-size: 0.85rem;
    }

    /* Dashboard Tabs */
    .dash-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }
    .tab-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
    .tab-btn.active {
      background: #ff1e43;
      border-color: #ff1e43;
      color: #ffffff;
      box-shadow: 0 0 20px rgba(255, 30, 67, 0.4);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .stat-card.red-glow {
      border-color: rgba(255, 30, 67, 0.4);
      box-shadow: 0 0 25px rgba(255, 30, 67, 0.15);
    }
    .stat-title {
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
    }
    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 2.25rem;
      color: #ffffff;
    }
    .stat-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Today Schedule Panel */
    .today-schedule-box {
      padding: 24px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .panel-header h3 { font-size: 1.1rem; color: #ffffff; }
    .btn-sm { padding: 6px 12px; font-size: 0.8rem; }
    .empty-list { color: #64748b; font-size: 0.9rem; font-style: italic; }
    .today-list { display: flex; flex-direction: column; gap: 10px; }
    .today-item {
      background: rgba(10, 10, 16, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .today-time {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      color: #ff1e43;
      width: 100px;
    }
    .today-details { flex: 1; display: flex; flex-direction: column; }
    .today-details strong { color: #ffffff; }
    .today-details span { color: #94a3b8; font-size: 0.85rem; }

    /* Appointments Table */
    .filter-bar {
      padding: 16px 20px;
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .filter-group { display: flex; align-items: center; gap: 10px; }
    .filter-group label { color: #94a3b8; font-size: 0.85rem; font-weight: 600; }
    .date-input, .select-input { width: auto; padding: 8px 14px; font-size: 0.85rem; }
    
    .appointments-table-container { padding: 10px; overflow-x: auto; }
    .dash-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .dash-table th {
      padding: 14px 16px;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .dash-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
    .code-id { font-family: 'Outfit', sans-serif; letter-spacing: 0.05em; color: #ff1e43; }
    .action-buttons { display: flex; gap: 6px; }
    .btn-action {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .btn-action.complete { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .btn-action.complete:hover { background: #10b981; color: #ffffff; }
    .btn-action.cancel { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-action.cancel:hover { background: #ef4444; color: #ffffff; }
    .text-center { text-align: center; color: #64748b; padding: 30px !important; }

    /* Slot Management Grid */
    .slot-manager-header { padding: 20px; margin-bottom: 20px; }
    .manager-desc { color: #94a3b8; font-size: 0.9rem; margin-top: 12px; }
    .admin-slots-grid {
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
    }
    .admin-slot-card {
      background: rgba(10, 10, 16, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }
    .admin-slot-card:hover {
      border-color: #ff1e43;
      transform: translateY(-2px);
    }
    .slot-time { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: #ffffff; margin-bottom: 8px; }
    .state-badge { font-size: 0.75rem; font-weight: 700; border-radius: 4px; padding: 2px 6px; }
    .state-badge.available { color: #34d399; }
    .state-badge.booked { color: #60a5fa; }
    .state-badge.blocked { color: #f87171; }
    .admin-slot-card.slot-blocked { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .slot-hover-hint { font-size: 0.7rem; color: #ff1e43; font-weight: 700; margin-top: 8px; opacity: 0.8; }

    .mini-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .dash-tabs { flex-direction: column; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  isLoggedIn: boolean = false;
  adminUsername: string = '';

  loginUsername: string = 'admin';
  loginPassword: string = 'admin123';
  isLoggingIn: boolean = false;
  loginError: string = '';

  activeTab: 'overview' | 'appointments' | 'slots' = 'overview';
  stats: DashboardStats | null = null;

  appointments: Booking[] = [];
  todayAppointments: Booking[] = [];
  filterDate: string = '';
  filterStatus: string = '';
  todayDateStr: string = '';

  slotManagerDate: string = '';
  adminSlots: TimeSlot[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.todayDateStr = new Date().toISOString().split('T')[0];
    this.slotManagerDate = this.todayDateStr;

    if (this.apiService.isAdminLoggedIn()) {
      this.isLoggedIn = true;
      this.adminUsername = 'admin';
      this.loadDashboardData();
    }
  }

  handleLogin(event: Event) {
    event.preventDefault();
    this.isLoggingIn = true;
    this.loginError = '';

    this.apiService.adminLogin(this.loginUsername, this.loginPassword).subscribe({
      next: (res) => {
        this.isLoggingIn = false;
        this.apiService.setAdminToken(res.token);
        this.isLoggedIn = true;
        this.adminUsername = res.username;
        this.loadDashboardData();
      },
      error: (err) => {
        this.isLoggingIn = false;
        this.loginError = err.error?.error || 'Invalid credentials. Try admin / admin123';
      }
    });
  }

  handleLogout() {
    this.apiService.clearAdminToken();
    this.isLoggedIn = false;
  }

  loadDashboardData() {
    this.fetchStats();
    this.fetchAppointments();
  }

  fetchStats() {
    this.apiService.getDashboardStats().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Failed to fetch stats', err)
    });
  }

  fetchAppointments(overrideDate?: string) {
    const targetDate = overrideDate || this.filterDate;
    this.apiService.getAppointments(targetDate, this.filterStatus).subscribe({
      next: (res) => {
        this.appointments = res.appointments;
        if (overrideDate === this.todayDateStr || (!this.filterDate && !this.filterStatus)) {
          this.todayAppointments = res.appointments.filter(a => a.appointmentDate === this.todayDateStr);
        }
      },
      error: (err) => console.error('Failed to fetch appointments', err)
    });
  }

  updateStatus(bookingId: string, status: string) {
    this.apiService.updateAppointmentStatus(bookingId, status).subscribe({
      next: () => {
        this.fetchStats();
        this.fetchAppointments();
      },
      error: (err) => alert(err.error?.error || 'Failed to update status')
    });
  }

  fetchAdminSlots() {
    if (!this.slotManagerDate) return;
    this.apiService.getAdminSlots(this.slotManagerDate).subscribe({
      next: (res) => this.adminSlots = res.slots,
      error: (err) => console.error('Failed to fetch admin slots', err)
    });
  }

  toggleSlot(slot: TimeSlot) {
    if (slot.status === 'booked') {
      alert('This slot is currently booked by a customer. Cancel the appointment first to unblock.');
      return;
    }

    const action = slot.status === 'blocked' ? 'unblock' : 'block';
    this.apiService.toggleSlotBlock(this.slotManagerDate, slot.time, action).subscribe({
      next: () => this.fetchAdminSlots(),
      error: (err) => alert('Failed to update slot status')
    });
  }
}
