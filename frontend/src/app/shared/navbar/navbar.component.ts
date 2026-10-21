import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  isDark = false;
  menuOpen = false;
  dropdownOpen = false;

  private readonly themeKey = 'theme';

  constructor(
    private router: Router,
    private host: ElementRef<HTMLElement>,
    public auth: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // --- THEME ---
  toggleTheme(): void {
    this.applyTheme(!this.isDark);
    try { localStorage.setItem(this.themeKey, this.isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  }

  private applyTheme(dark: boolean): void {
    this.isDark = dark;
    const theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
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
        if (error.status === 401) {
          this.auth.clearSession();
          this.router.navigate(['/login']);
          return;
        }
        this.toastr.error('The server is unavailable. Your session is still saved; try again when the connection returns.', 'Logout unavailable');
      }
    });
  }
}
