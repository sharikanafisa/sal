import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Booking } from '../../services/api.service';

@Component({
  selector: 'app-my-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="my-booking-wrapper">
      <div class="container">
        
        <!-- Header -->
        <header class="page-header">
          <span class="spider-tag">APPOINTMENT LOOKUP</span>
          <h1 class="page-title">MY BOOKING</h1>
          <p class="page-subtitle">Track your appointment status or manage your slot using your Booking ID or WhatsApp number.</p>
        </header>

        <!-- Search Bar -->
        <div class="search-box glass-panel">
          <div class="search-input-group">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              class="search-input" 
              placeholder="Enter Booking ID (e.g. SP-84920) or WhatsApp Number"
              [(ngModel)]="searchQuery"
              (keyup.enter)="performSearch()">
            <button class="btn-spider search-btn" [disabled]="isSearching" (click)="performSearch()">
              <span *ngIf="!isSearching">SEARCH</span>
              <span *ngIf="isSearching" class="mini-spinner"></span>
            </button>
          </div>
        </div>

        <!-- Search Results State -->
        <div *ngIf="hasSearched">

          <div *ngIf="searchError" class="alert-box error">
            ⚠️ {{ searchError }}
          </div>

          <div *ngIf="bookings.length === 0 && !searchError" class="empty-state glass-panel">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 30, 67, 0.4)" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <h3>No Appointments Found</h3>
            <p>We couldn't find any bookings matching "<strong>{{ searchQuery }}</strong>". Please double check your Booking ID or phone number.</p>
          </div>

          <div *ngIf="bookings.length > 0" class="results-list">
            <div *ngFor="let b of bookings" class="booking-card glass-panel" [class.cancelled-card]="b.status === 'cancelled'">
              <div class="card-top">
                <div class="booking-id-tag">
                  <span>ID:</span> <strong>{{ b.bookingId }}</strong>
                </div>
                <span class="badge" [class]="'badge-' + b.status">
                  {{ b.status.toUpperCase() }}
                </span>
              </div>

              <div class="card-body">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Service</span>
                    <strong class="info-val highlight-red">{{ b.service }}</strong>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Date & Time</span>
                    <strong class="info-val">📅 {{ b.appointmentDate }} at {{ b.appointmentTime }}</strong>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Customer Name</span>
                    <strong class="info-val">{{ b.customerName }}</strong>
                  </div>
                  <div class="info-item">
                    <span class="info-label">WhatsApp</span>
                    <strong class="info-val">{{ b.whatsappNumber }}</strong>
                  </div>
                </div>
              </div>

              <!-- Cancel Appointment Action (Only for active confirmed appointments) -->
              <div *ngIf="b.status === 'confirmed'" class="card-footer">
                <button 
                  *ngIf="cancellingId !== b.bookingId" 
                  class="btn-cancel-slot"
                  (click)="confirmCancellationPrompt(b.bookingId)">
                  Cancel Appointment
                </button>

                <div *ngIf="cancellingId === b.bookingId" class="confirm-cancel-box">
                  <span>Are you sure you want to cancel this appointment?</span>
                  <div class="confirm-btns">
                    <button class="btn-secondary" (click)="cancellingId = null">Keep Slot</button>
                    <button class="btn-danger-confirm" [disabled]="isCancelling" (click)="executeCancel(b.bookingId)">
                      <span *ngIf="!isCancelling">Yes, Cancel Slot</span>
                      <span *ngIf="isCancelling" class="mini-spinner"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div *ngIf="b.status === 'cancelled'" class="cancelled-notice">
                ℹ️ This slot has been cancelled and is available for re-booking.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    .my-booking-wrapper {
      padding: 40px 16px 80px 16px;
      min-height: calc(100vh - 70px);
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 680px;
    }
    .page-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .spider-tag {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 30, 67, 0.1);
      border: 1px solid rgba(255, 30, 67, 0.3);
      border-radius: 20px;
      color: #ff1e43;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin-bottom: 10px;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .page-subtitle {
      color: #94a3b8;
      font-size: 0.95rem;
    }
    .search-box {
      padding: 16px;
      margin-bottom: 30px;
    }
    .search-input-group {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      width: 20px;
      height: 20px;
      color: #64748b;
    }
    .search-input {
      flex: 1;
      background: rgba(10, 10, 16, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 14px 16px 14px 48px;
      color: #ffffff;
      font-size: 0.95rem;
    }
    .search-input:focus {
      outline: none;
      border-color: #ff1e43;
      box-shadow: 0 0 0 3px rgba(255, 30, 67, 0.3);
    }
    .search-btn {
      width: auto;
      padding: 14px 24px;
      white-space: nowrap;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
    .empty-state h3 {
      font-size: 1.25rem;
      color: #ffffff;
      margin: 12px 0 6px 0;
    }
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .booking-card {
      padding: 24px;
    }
    .booking-card.cancelled-card {
      opacity: 0.7;
      border-color: rgba(255, 255, 255, 0.08);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .booking-id-tag {
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      color: #ffffff;
    }
    .booking-id-tag span { color: #94a3b8; font-size: 0.9rem; margin-right: 4px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .info-val {
      color: #ffffff;
      font-size: 0.95rem;
    }
    .card-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .btn-cancel-slot {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-cancel-slot:hover {
      background: #ef4444;
      color: #ffffff;
    }
    .confirm-cancel-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      padding: 14px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.9rem;
      color: #ffffff;
    }
    .confirm-btns {
      display: flex;
      gap: 8px;
    }
    .btn-danger-confirm {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
    .cancelled-notice {
      margin-top: 12px;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .alert-box.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .mini-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .search-input-group { flex-direction: column; }
      .search-btn { width: 100%; }
      .info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyBookingComponent implements OnInit {
  searchQuery: string = '';
  isSearching: boolean = false;
  hasSearched: boolean = false;
  searchError: string = '';
  bookings: Booking[] = [];

  cancellingId: string | null = null;
  isCancelling: boolean = false;

  constructor(private apiService: ApiService) {}

  ngOnInit() {}

  performSearch() {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.searchError = 'Please enter a Booking ID or WhatsApp number.';
      this.hasSearched = true;
      this.bookings = [];
      return;
    }

    this.isSearching = true;
    this.searchError = '';
    this.hasSearched = true;

    this.apiService.searchBooking(this.searchQuery.trim()).subscribe({
      next: (res) => {
        this.isSearching = false;
        this.bookings = res.bookings;
      },
      error: (err) => {
        this.isSearching = false;
        this.searchError = err.error?.error || 'Failed to search booking';
        this.bookings = [];
      }
    });
  }

  confirmCancellationPrompt(bookingId: string) {
    this.cancellingId = bookingId;
  }

  executeCancel(bookingId: string) {
    this.isCancelling = true;
    this.apiService.cancelBooking(bookingId).subscribe({
      next: (res) => {
        this.isCancelling = false;
        this.cancellingId = null;
        // Refresh search results
        this.performSearch();
      },
      error: (err) => {
        this.isCancelling = false;
        alert(err.error?.error || 'Failed to cancel booking');
      }
    });
  }
}
