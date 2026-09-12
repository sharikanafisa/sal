import { Routes } from '@angular/router';
import { BookingPageComponent } from './components/booking-page/booking-page.component';
import { MyBookingComponent } from './components/my-booking/my-booking.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: '', component: BookingPageComponent },
  { path: 'my-booking', component: MyBookingComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];
