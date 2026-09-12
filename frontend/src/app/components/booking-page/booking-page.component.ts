import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, TimeSlot, Booking } from '../../services/api.service';

interface ServiceOption {
  id: string;
  name: string;
  duration: string;
  iconSvg: string;
}

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="booking-wrapper">
      <div class="container">
        
        <!-- Header Banner -->
        <header class="booking-header">
          <div class="badge-tag">
            <span class="web-dot"></span> 1 BARBER ONLY
          </div>
          <h1 class="main-title">BOOK YOUR SLOT</h1>
          <p class="subtitle">Choose your service, date and preferred time.</p>
        </header>

        <!-- Booking Flow Stepper (If not confirmed yet) -->
        <div *ngIf="!confirmedBooking" class="stepper-bar">
          <div class="step-item" [class.active]="currentStep >= 1" [class.completed]="currentStep > 1" (click)="goToStep(1)">
            <div class="step-num">1</div>
            <span class="step-label">Service</span>
          </div>
          <div class="step-line" [class.active]="currentStep > 1"></div>

          <div class="step-item" [class.active]="currentStep >= 2" [class.completed]="currentStep > 2" (click)="goToStep(2)">
            <div class="step-num">2</div>
            <span class="step-label">Date & Time</span>
          </div>
          <div class="step-line" [class.active]="currentStep > 2"></div>

          <div class="step-item" [class.active]="currentStep >= 3" [class.completed]="currentStep > 3" (click)="goToStep(3)">
            <div class="step-num">3</div>
            <span class="step-label">Details</span>
          </div>
          <div class="step-line" [class.active]="currentStep > 3"></div>

          <div class="step-item" [class.active]="currentStep >= 4">
            <div class="step-num">4</div>
            <span class="step-label">Confirm</span>
          </div>
        </div>

        <!-- MAIN BOOKING CONTAINER -->
        <div *ngIf="!confirmedBooking" class="booking-card glass-panel">

          <!-- STEP 1: SERVICE SELECTOR -->
          <section *ngIf="currentStep === 1" class="step-section">
            <h2 class="section-heading">STEP 1 — SELECT SERVICE</h2>
            <div class="services-grid">
              <div 
                *ngFor="let s of services" 
                class="service-card"
                [class.selected]="selectedService === s.name"
                (click)="selectService(s.name)">
                <div class="service-icon-box" [innerHTML]="s.iconSvg"></div>
                <div class="service-info">
                  <h3 class="service-name">{{ s.name }}</h3>
                  <span class="service-duration">{{ s.duration }}</span>
                </div>
                <div class="radio-indicator">
                  <div class="radio-inner" *ngIf="selectedService === s.name"></div>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button 
                class="btn-spider" 
                [disabled]="!selectedService" 
                (click)="goToStep(2)">
                Next: Select Date & Time
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </section>

          <!-- STEP 2: DATE & TIME SELECTOR -->
          <section *ngIf="currentStep === 2" class="step-section">
            <h2 class="section-heading">STEP 2 — CHOOSE DATE & TIME</h2>

            <!-- Custom Calendar -->
            <div class="calendar-box">
              <div class="calendar-header">
                <button class="cal-nav-btn" (click)="changeMonth(-1)" [disabled]="isCurrentMonth()">
                  ‹
                </button>
                <span class="month-title">{{ currentMonthYear }}</span>
                <button class="cal-nav-btn" (click)="changeMonth(1)">
                  ›
                </button>
              </div>

              <!-- Day Names -->
              <div class="calendar-weekdays">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>

              <!-- Month Days Grid -->
              <div class="calendar-days">
                <div *ngFor="let day of calendarDays" 
                     class="cal-day"
                     [class.empty]="!day.dateStr"
                     [class.disabled]="day.isDisabled"
                     [class.today]="day.isToday"
                     [class.selected]="selectedDate === day.dateStr"
                     (click)="selectDate(day)">
                  <span>{{ day.dayNum }}</span>
                  <span *ngIf="day.isToday" class="today-dot"></span>
                </div>
              </div>
            </div>

            <!-- Selected Date Label -->
            <div class="selected-date-badge" *ngIf="selectedDate">
              📅 Selected Date: <strong>{{ formattedSelectedDate }}</strong>
            </div>

            <!-- Step 3 embedded in Step 2 for seamless flow -->
            <div class="slots-section" *ngIf="selectedDate">
              <h3 class="slots-heading">STEP 3 — AVAILABLE TIME SLOTS</h3>

              <div *ngIf="isLoadingSlots" class="slots-loader">
                <div class="spider-spinner"></div>
                <p>Checking live slot availability...</p>
              </div>

              <div *ngIf="!isLoadingSlots && availableSlots.length === 0" class="no-slots-alert">
                <p>⚠️ No slots available for this date. Please choose another date.</p>
              </div>

              <div *ngIf="!isLoadingSlots && availableSlots.length > 0" class="slots-grid">
                <button 
                  *ngFor="let slot of availableSlots"
                  class="slot-card"
                  [class.booked]="slot.status === 'booked'"
                  [class.unavailable]="slot.status === 'unavailable' || slot.status === 'blocked'"
                  [class.selected]="selectedTime === slot.time"
                  [disabled]="slot.status !== 'available'"
                  (click)="selectTime(slot)">
                  <span class="time-text">{{ slot.time }}</span>
                  <span class="slot-badge" [class]="'badge-' + slot.status">
                    {{ slot.status === 'available' ? 'Available' : (slot.status === 'booked' ? 'Booked' : 'Unavailable') }}
                  </span>
                </button>
              </div>
            </div>

            <div class="step-actions dual">
              <button class="btn-secondary" (click)="goToStep(1)">Back</button>
              <button 
                class="btn-spider" 
                [disabled]="!selectedDate || !selectedTime" 
                (click)="goToStep(3)">
                Next: Enter Details
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </section>

          <!-- STEP 4: CUSTOMER DETAILS -->
          <section *ngIf="currentStep === 3" class="step-section">
            <h2 class="section-heading">STEP 4 — CUSTOMER DETAILS</h2>

            <div class="form-container">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input 
                  type="text" 
                  class="form-input"
                  [class.invalid]="nameError"
                  placeholder="e.g. Peter Parker"
                  [(ngModel)]="customerName"
                  (input)="nameError = false">
                <p *ngIf="nameError" class="error-text">Please enter your full name.</p>
              </div>

              <div class="form-group">
                <label class="form-label">WhatsApp Number *</label>
                <input 
                  type="tel" 
                  class="form-input"
                  [class.invalid]="phoneError"
                  placeholder="e.g. +1 555 019 2831 or 10-digit number"
                  [(ngModel)]="whatsappNumber"
                  (input)="phoneError = false">
                <p *ngIf="phoneError" class="error-text">Please enter a valid WhatsApp number (minimum 7-15 digits).</p>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address (Optional)</label>
                <input 
                  type="email" 
                  class="form-input"
                  placeholder="e.g. peter@webmail.com"
                  [(ngModel)]="customerEmail">
              </div>
            </div>

            <div class="step-actions dual">
              <button class="btn-secondary" (click)="goToStep(2)">Back</button>
              <button 
                class="btn-spider" 
                (click)="validateAndProceedToSummary()">
                Review Summary
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </section>

          <!-- BOOKING SUMMARY (Step 4) -->
          <section *ngIf="currentStep === 4" class="step-section">
            <h2 class="section-heading">APPOINTMENT SUMMARY</h2>

            <div class="summary-card">
              <div class="summary-row">
                <span class="summary-label">Service</span>
                <span class="summary-value highlight-red">{{ selectedService }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Date</span>
                <span class="summary-value">{{ formattedSelectedDate }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Time</span>
                <span class="summary-value">{{ selectedTime }}</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-row">
                <span class="summary-label">Customer Name</span>
                <span class="summary-value">{{ customerName }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">WhatsApp Number</span>
                <span class="summary-value">{{ whatsappNumber }}</span>
              </div>
              <div *ngIf="customerEmail" class="summary-row">
                <span class="summary-label">Email</span>
                <span class="summary-value">{{ customerEmail }}</span>
              </div>
            </div>

            <div *ngIf="bookingErrorMessage" class="error-alert">
              ⚠️ {{ bookingErrorMessage }}
            </div>

            <div class="step-actions dual">
              <button class="btn-secondary" [disabled]="isSubmitting" (click)="goToStep(3)">Back</button>
              <button 
                class="btn-spider btn-confirm" 
                [disabled]="isSubmitting"
                (click)="confirmSlot()">
                <span *ngIf="!isSubmitting">CONFIRM SLOT</span>
                <span *ngIf="isSubmitting" class="loader-flex">
                  <div class="mini-spinner"></div> Confirming...
                </span>
              </button>
            </div>
          </section>
        </div>

        <!-- BOOKING CONFIRMATION SCREEN -->
        <div *ngIf="confirmedBooking" class="confirmation-card glass-panel web-pulse-container">
          <div class="spider-web-bg"></div>

          <!-- Animated Confirmation SVG Motif -->
          <div class="success-icon-box">
            <svg class="success-svg" viewBox="0 0 60 60">
              <polygon points="30,5 55,20 55,45 30,58 5,45 5,20" fill="none" stroke="#ff1e43" stroke-width="2" opacity="0.6"/>
              <circle cx="30" cy="30" r="22" fill="rgba(255, 30, 67, 0.15)" stroke="#ff1e43" stroke-width="2"/>
              <path d="M20 30 L27 37 L41 22" fill="none" stroke="#ff1e43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="draw-checkmark"/>
            </svg>
          </div>

          <h2 class="confirm-title">✓ SLOT CONFIRMED</h2>
          <p class="confirm-subtitle">Your appointment has been successfully booked.</p>

          <div class="booking-id-box">
            <span class="id-label">BOOKING ID</span>
            <span class="id-code">{{ confirmedBooking.bookingId }}</span>
          </div>

          <div class="confirm-details-card">
            <div class="confirm-row">
              <span>Service</span>
              <strong>{{ confirmedBooking.service }}</strong>
            </div>
            <div class="confirm-row">
              <span>Date</span>
              <strong>{{ confirmedBooking.appointmentDate }}</strong>
            </div>
            <div class="confirm-row">
              <span>Time</span>
              <strong>{{ confirmedBooking.appointmentTime }}</strong>
            </div>
            <div class="confirm-row">
              <span>Name</span>
              <strong>{{ confirmedBooking.customerName }}</strong>
            </div>
            <div class="confirm-row">
              <span>WhatsApp</span>
              <strong>{{ confirmedBooking.whatsappNumber }}</strong>
            </div>
          </div>

          <div class="whatsapp-notice">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5.1-1.3A10 10 0 10 12 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 0.8 0.8-2.9-.2-.3A8 8 0 1112 20z"/>
            </svg>
            <span>A confirmation message has been automatically dispatched to your WhatsApp number. You will also receive a reminder 24 hours before your slot!</span>
          </div>

          <div class="confirm-actions">
            <a routerLink="/my-booking" class="btn-secondary">BOOKING DETAILS</a>
            <button class="btn-spider" (click)="resetBooking()">BOOK ANOTHER SLOT</button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .booking-wrapper {
      padding: 40px 16px 80px 16px;
      min-height: calc(100vh - 70px);
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 680px;
    }
    .booking-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(255, 30, 67, 0.1);
      border: 1px solid rgba(255, 30, 67, 0.3);
      border-radius: 20px;
      color: #ff1e43;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    }
    .web-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ff1e43;
      box-shadow: 0 0 8px #ff1e43;
    }
    .main-title {
      font-size: 2.25rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.03em;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 1rem;
    }
    .stepper-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 0 10px;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      transition: all 0.3s ease;
    }
    .step-item.active .step-num {
      background: #ff1e43;
      border-color: #ff1e43;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(255, 30, 67, 0.5);
    }
    .step-item.completed .step-num {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #10b981;
    }
    .step-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
    }
    .step-item.active .step-label {
      color: #ffffff;
    }
    .step-line {
      flex: 1;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 8px;
      margin-bottom: 16px;
      transition: background 0.3s ease;
    }
    .step-line.active {
      background: #ff1e43;
    }
    .booking-card {
      padding: 32px;
    }
    .section-heading {
      font-size: 1.1rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.05em;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .services-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .service-card {
      background: rgba(10, 10, 16, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.25s ease;
    }
    .service-card:hover {
      background: rgba(255, 30, 67, 0.05);
      border-color: rgba(255, 30, 67, 0.3);
    }
    .service-card.selected {
      background: rgba(255, 30, 67, 0.12);
      border-color: #ff1e43;
      box-shadow: 0 0 20px rgba(255, 30, 67, 0.25);
    }
    .service-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(255, 30, 67, 0.15);
      color: #ff1e43;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .service-info {
      flex: 1;
    }
    .service-name {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }
    .service-duration {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .radio-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .service-card.selected .radio-indicator {
      border-color: #ff1e43;
    }
    .radio-inner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ff1e43;
      box-shadow: 0 0 8px #ff1e43;
    }
    
    /* Calendar Styling */
    .calendar-box {
      background: rgba(8, 8, 12, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .month-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 1.1rem;
      color: #ffffff;
    }
    .cal-nav-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .cal-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 10px;
    }
    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }
    .cal-day {
      aspect-ratio: 1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    .cal-day:hover:not(.disabled):not(.empty) {
      background: rgba(255, 30, 67, 0.2);
      color: #ffffff;
    }
    .cal-day.disabled {
      opacity: 0.25;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .cal-day.empty {
      background: transparent;
      cursor: default;
    }
    .cal-day.today {
      border: 1px stroke #ff1e43;
    }
    .today-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #ff1e43;
      position: absolute;
      bottom: 4px;
    }
    .cal-day.selected {
      background: #ff1e43 !important;
      color: #ffffff !important;
      box-shadow: 0 0 15px rgba(255, 30, 67, 0.6);
    }
    
    .selected-date-badge {
      background: rgba(255, 30, 67, 0.1);
      border: 1px solid rgba(255, 30, 67, 0.3);
      padding: 10px 16px;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.9rem;
      margin-bottom: 24px;
    }

    /* Slots Grid */
    .slots-heading {
      font-size: 0.95rem;
      font-weight: 800;
      color: #94a3b8;
      margin-bottom: 14px;
      letter-spacing: 0.05em;
    }
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
      margin-bottom: 28px;
    }
    .slot-card {
      background: rgba(12, 12, 18, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .slot-card:hover:not(:disabled) {
      border-color: #ff1e43;
      transform: translateY(-2px);
    }
    .slot-card.selected {
      background: #ff1e43;
      border-color: #ff1e43;
      box-shadow: 0 0 15px rgba(255, 30, 67, 0.5);
    }
    .slot-card.selected .time-text {
      color: #ffffff;
    }
    .slot-card.selected .slot-badge {
      background: rgba(0, 0, 0, 0.3);
      color: #ffffff;
    }
    .time-text {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      color: #ffffff;
    }
    .slot-card.booked, .slot-card.unavailable {
      opacity: 0.4;
      cursor: not-allowed;
      background: rgba(5, 5, 8, 0.8);
      border-color: rgba(255, 255, 255, 0.05);
    }
    .badge-available { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-booked { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .badge-unavailable { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    
    .no-slots-alert {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 14px 18px;
      border-radius: 8px;
      color: #f87171;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .slots-loader {
      text-align: center;
      padding: 30px;
      color: #94a3b8;
    }
    .spider-spinner {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(255, 30, 67, 0.2);
      border-top-color: #ff1e43;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .step-actions {
      margin-top: 20px;
    }
    .step-actions.dual {
      display: flex;
      gap: 12px;
    }
    .step-actions.dual .btn-spider {
      flex: 2;
    }
    .step-actions.dual .btn-secondary {
      flex: 1;
    }

    /* Summary Card */
    .summary-card {
      background: rgba(8, 8, 12, 0.95);
      border: 1px solid rgba(255, 30, 67, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
    }
    .summary-label {
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .summary-value {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      color: #ffffff;
      font-size: 1rem;
    }
    .highlight-red {
      color: #ff1e43;
    }
    .summary-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 12px 0;
    }
    .error-alert {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 600;
    }

    /* Confirmation Card */
    .confirmation-card {
      text-align: center;
      padding: 40px 28px;
      position: relative;
      overflow: hidden;
    }
    .success-icon-box {
      width: 70px;
      height: 70px;
      margin: 0 auto 20px auto;
    }
    .confirm-title {
      font-size: 2rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }
    .confirm-subtitle {
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .booking-id-box {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 30, 67, 0.12);
      border: 1px solid #ff1e43;
      padding: 12px 28px;
      border-radius: 12px;
      margin-bottom: 28px;
      box-shadow: 0 0 25px rgba(255, 30, 67, 0.3);
    }
    .id-label {
      font-size: 0.7rem;
      font-weight: 800;
      color: #ff1e43;
      letter-spacing: 0.15em;
    }
    .id-code {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 1.75rem;
      color: #ffffff;
      letter-spacing: 0.05em;
    }
    .confirm-details-card {
      background: rgba(10, 10, 16, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .confirm-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .confirm-row:last-child {
      border-bottom: none;
    }
    .confirm-row span { color: #94a3b8; font-size: 0.9rem; }
    .confirm-row strong { color: #ffffff; font-weight: 700; }
    .whatsapp-notice {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 10px;
      padding: 14px 18px;
      color: #34d399;
      font-size: 0.85rem;
      text-align: left;
      margin-bottom: 28px;
    }
    .confirm-actions {
      display: flex;
      gap: 12px;
    }
    .confirm-actions .btn-secondary, .confirm-actions .btn-spider {
      flex: 1;
    }
    .mini-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loader-flex {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 640px) {
      .services-grid { grid-template-columns: 1fr; }
      .booking-card { padding: 20px 16px; }
      .confirm-actions { flex-direction: column; }
    }
  `]
})
export class BookingPageComponent implements OnInit {
  currentStep = 1;

  // Step 1 Services
  services: ServiceOption[] = [
    {
      id: 'haircut',
      name: 'Haircut',
      duration: '30 mins',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`
    },
    {
      id: 'beard',
      name: 'Beard Trim',
      duration: '20 mins',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.5 1.8 6.5 4.5 8.2L12 22l5.5-1.8C20.2 18.5 22 15.5 22 12c0-5.52-4.48-10-10-10z"/><path d="M8 11s1.5 2 4 2 4-2 4-2"/></svg>`
    },
    {
      id: 'combo',
      name: 'Haircut + Beard',
      duration: '50 mins',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2"/></svg>`
    },
    {
      id: 'styling',
      name: 'Hair Styling',
      duration: '25 mins',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></svg>`
    }
  ];

  selectedService: string = 'Haircut';

  // Step 2 Calendar & Time
  currentMonthDate: Date = new Date();
  currentMonthYear: string = '';
  calendarDays: { dayNum: number; dateStr: string; isToday: boolean; isDisabled: boolean }[] = [];
  selectedDate: string = '';
  formattedSelectedDate: string = '';

  availableSlots: TimeSlot[] = [];
  selectedTime: string = '';
  isLoadingSlots: boolean = false;

  // Step 3 Customer Form
  customerName: string = '';
  whatsappNumber: string = '';
  customerEmail: string = '';
  nameError: boolean = false;
  phoneError: boolean = false;

  // Step 4 Confirmation & Submitting
  isSubmitting: boolean = false;
  bookingErrorMessage: string = '';
  confirmedBooking: Booking | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.renderCalendar();
    // Default to today's date
    const todayStr = this.getTodayDateString();
    this.selectedDate = todayStr;
    this.formattedSelectedDate = this.formatDateDisplay(todayStr);
    this.fetchSlotsForDate(todayStr);
  }

  selectService(serviceName: string) {
    this.selectedService = serviceName;
  }

  goToStep(stepNum: number) {
    if (stepNum > this.currentStep) {
      if (stepNum === 2 && !this.selectedService) return;
      if (stepNum === 3 && (!this.selectedDate || !this.selectedTime)) return;
      if (stepNum === 4 && (!this.customerName || !this.whatsappNumber)) return;
    }
    this.currentStep = stepNum;
  }

  // Calendar logic
  getTodayDateString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  isCurrentMonth(): boolean {
    const today = new Date();
    return this.currentMonthDate.getFullYear() === today.getFullYear() &&
           this.currentMonthDate.getMonth() === today.getMonth();
  }

  changeMonth(delta: number) {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + delta);
    this.renderCalendar();
  }

  renderCalendar() {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    this.currentMonthYear = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = this.getTodayDateString();

    const days = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: 0, dateStr: '', isToday: false, isDisabled: true });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;

      const isToday = dateStr === todayStr;
      const isDisabled = dateStr < todayStr;

      days.push({ dayNum, dateStr, isToday, isDisabled });
    }

    this.calendarDays = days;
  }

  selectDate(day: { dateStr: string; isDisabled: boolean }) {
    if (!day.dateStr || day.isDisabled) return;
    this.selectedDate = day.dateStr;
    this.formattedSelectedDate = this.formatDateDisplay(day.dateStr);
    this.selectedTime = '';
    this.fetchSlotsForDate(day.dateStr);
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  fetchSlotsForDate(dateStr: string) {
    this.isLoadingSlots = true;
    this.apiService.getAvailableSlots(dateStr).subscribe({
      next: (res) => {
        this.availableSlots = res.slots;
        this.isLoadingSlots = false;
      },
      error: (err) => {
        console.error('Error fetching slots', err);
        this.isLoadingSlots = false;
      }
    });
  }

  selectTime(slot: TimeSlot) {
    if (slot.status === 'available') {
      this.selectedTime = slot.time;
    }
  }

  validateAndProceedToSummary() {
    this.nameError = !this.customerName || !this.customerName.trim();
    
    // WhatsApp format validation (minimum 7 digits)
    const digitsOnly = this.whatsappNumber.replace(/\D/g, '');
    this.phoneError = !this.whatsappNumber || digitsOnly.length < 7 || digitsOnly.length > 15;

    if (!this.nameError && !this.phoneError) {
      this.goToStep(4);
    }
  }

  confirmSlot() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.bookingErrorMessage = '';

    const payload = {
      service: this.selectedService,
      appointmentDate: this.selectedDate,
      appointmentTime: this.selectedTime,
      customerName: this.customerName.trim(),
      whatsappNumber: this.whatsappNumber.trim(),
      email: this.customerEmail ? this.customerEmail.trim() : undefined
    };

    this.apiService.createBooking(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.confirmedBooking = res.booking;
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 409) {
          this.bookingErrorMessage = err.error?.error || 'This slot was just booked by another user. Please go back and pick a different slot.';
        } else {
          this.bookingErrorMessage = err.error?.error || 'Failed to book slot. Please try again.';
        }
      }
    });
  }

  resetBooking() {
    this.confirmedBooking = null;
    this.currentStep = 1;
    this.selectedTime = '';
    this.customerName = '';
    this.whatsappNumber = '';
    this.customerEmail = '';
    const todayStr = this.getTodayDateString();
    this.selectedDate = todayStr;
    this.formattedSelectedDate = this.formatDateDisplay(todayStr);
    this.fetchSlotsForDate(todayStr);
  }
}
