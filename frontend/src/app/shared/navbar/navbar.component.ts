import { Component, ElementRef, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  isDark = true;
  menuOpen = false;
  dropdownOpen = false;

  constructor(
    private router: Router,
    private host: ElementRef<HTMLElement>,
    public auth: AuthService,
    private toastr: ToastrService
  ) {
    this.isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    const theme = this.isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* Storage may be unavailable. */ }
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
  }

  // --- MENUS ---
  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.dropdownOpen = false;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
    this.menuOpen = false;
  }

  // Close menus when clicking outside the navbar
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen = false;
      this.dropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
    this.dropdownOpen = false;
  }

  // --- LOGOUT ---
  logout(): void {
    this.dropdownOpen = false;

    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: error => {
        this.router.navigate(['/login']);
        if (error.status !== 401) this.toastr.warning('You are signed out on this device. The server could not confirm logout.', 'Logout incomplete');
      }
    });
  }
}
