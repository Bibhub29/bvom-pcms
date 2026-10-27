import { Component, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isLoginPage = /^\/login\/?$/.test(window.location.pathname);
  isLogoutPage = /^\/logout\/?$/.test(window.location.pathname);
  get hideNavigation(): boolean { return this.isLoginPage || this.isLogoutPage; }
  private readonly destroyRef = inject(DestroyRef);

  constructor(private router: Router) {
    this.applyRouteTheme();
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.isLoginPage = /^\/login\/?$/.test(event.urlAfterRedirects.split(/[?#]/)[0]);
      this.isLogoutPage = /^\/logout\/?$/.test(event.urlAfterRedirects.split(/[?#]/)[0]);
      this.applyRouteTheme();
    });
  }

  private applyRouteTheme(): void {
    let savedTheme: string | null = null;
    try { savedTheme = localStorage.getItem('theme'); } catch { /* Storage may be unavailable. */ }
    const theme = savedTheme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
  }
}
