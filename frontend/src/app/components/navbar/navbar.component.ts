import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-header">
      <div class="nav-container">
        <!-- Logo Emblem -->
        <a routerLink="/" class="nav-brand">
          <div class="brand-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="brand-icon" style="width:20px; height:20px;">
              <path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">RESERVATION <span class="highlight">PORTAL</span></span>
            <span class="brand-tag">EXECUTIVE SYSTEM</span>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"/>
            </svg>
            <span>Book Slot</span>
          </a>
          
          <a routerLink="/my-booking" routerLinkActive="active" class="nav-link">
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span>My Booking</span>
          </a>

          <a routerLink="/admin" routerLinkActive="active" class="nav-link admin-link">
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span>Barber Portal</span>
          </a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .navbar-header {
      background: rgba(7, 7, 10, 0.9);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 30, 67, 0.2);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }
    .spider-logo-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #ff1e43 0%, #cc0f2f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(255, 30, 67, 0.4);
      transition: transform 0.3s ease;
    }
    .nav-brand:hover .spider-logo-box {
      transform: rotate(15deg) scale(1.05);
    }
    .spider-icon {
      width: 22px;
      height: 22px;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 1.25rem;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand-title .highlight {
      color: #ff1e43;
    }
    .brand-tag {
      font-size: 0.65rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.1em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      color: #94a3b8;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .nav-link:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }
    .nav-link.active {
      color: #ffffff;
      background: rgba(255, 30, 67, 0.15);
      border: 1px solid rgba(255, 30, 67, 0.4);
      box-shadow: 0 0 15px rgba(255, 30, 67, 0.2);
    }
    .admin-link {
      border: 1px dashed rgba(255, 255, 255, 0.15);
    }
    .link-icon {
      width: 16px;
      height: 16px;
    }
    @media (max-width: 640px) {
      .nav-container {
        padding: 10px 14px;
      }
      .brand-tag {
        display: none;
      }
      .nav-link span {
        display: none;
      }
      .nav-link {
        padding: 8px 12px;
      }
    }
  `]
})
export class NavbarComponent {}
