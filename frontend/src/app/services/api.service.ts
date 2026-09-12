import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimeSlot {
  time: string;
  status: 'available' | 'booked' | 'unavailable' | 'blocked';
  isSelectable?: boolean;
  bookingId?: string;
  customerName?: string;
}

export interface Booking {
  bookingId: string;
  customerName: string;
  whatsappNumber: string;
  email?: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt?: string;
}

export interface DashboardStats {
  todayBookings: number;
  upcomingBookings: number;
  totalBookings: number;
  availableSlotsToday: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000/api';
  private adminTokenKey = 'spiderman_admin_token';

  constructor(private http: HttpClient) {}

  // Local Admin Auth Token Management
  setAdminToken(token: string) {
    localStorage.setItem(this.adminTokenKey, token);
  }

  getAdminToken(): string | null {
    return localStorage.getItem(this.adminTokenKey);
  }

  clearAdminToken() {
    localStorage.removeItem(this.adminTokenKey);
  }

  isAdminLoggedIn(): boolean {
    return !!this.getAdminToken();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getAdminToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Customer Booking Endpoints
  getAvailableSlots(date: string): Observable<{ date: string; slots: TimeSlot[] }> {
    return this.http.get<{ date: string; slots: TimeSlot[] }>(`${this.baseUrl}/bookings/available-slots?date=${date}`);
  }

  createBooking(payload: {
    customerName: string;
    whatsappNumber: string;
    email?: string;
    service: string;
    appointmentDate: string;
    appointmentTime: string;
  }): Observable<{ message: string; booking: Booking }> {
    return this.http.post<{ message: string; booking: Booking }>(`${this.baseUrl}/bookings`, payload);
  }

  searchBooking(query: string): Observable<{ bookings: Booking[] }> {
    return this.http.get<{ bookings: Booking[] }>(`${this.baseUrl}/bookings/search?query=${encodeURIComponent(query)}`);
  }

  cancelBooking(bookingId: string): Observable<{ message: string; bookingId: string }> {
    return this.http.post<{ message: string; bookingId: string }>(`${this.baseUrl}/bookings/${bookingId}/cancel`, {});
  }

  // Admin Endpoints
  adminLogin(username: string, password: string): Observable<{ message: string; token: string; username: string }> {
    return this.http.post<{ message: string; token: string; username: string }>(`${this.baseUrl}/admin/login`, { username, password });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/admin/dashboard-stats`, { headers: this.getAuthHeaders() });
  }

  getAppointments(date?: string, status?: string): Observable<{ appointments: Booking[] }> {
    let url = `${this.baseUrl}/admin/appointments?`;
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}`;
    return this.http.get<{ appointments: Booking[] }>(url, { headers: this.getAuthHeaders() });
  }

  updateAppointmentStatus(bookingId: string, status: string): Observable<{ message: string; bookingId: string; status: string }> {
    return this.http.patch<{ message: string; bookingId: string; status: string }>(
      `${this.baseUrl}/admin/appointments/${bookingId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  getAdminSlots(date: string): Observable<{ date: string; slots: TimeSlot[] }> {
    return this.http.get<{ date: string; slots: TimeSlot[] }>(`${this.baseUrl}/admin/slots?date=${date}`, { headers: this.getAuthHeaders() });
  }

  toggleSlotBlock(date: string, time: string, action: 'block' | 'unblock'): Observable<{ message: string; date: string; time: string; action: string }> {
    return this.http.post<{ message: string; date: string; time: string; action: string }>(
      `${this.baseUrl}/admin/slots/toggle`,
      { date, time, action },
      { headers: this.getAuthHeaders() }
    );
  }
}
