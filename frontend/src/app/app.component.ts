import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, OnDestroy, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { NgxSpinnerModule } from 'ngx-spinner';

interface VantaEffect { destroy(): void; }

declare global {
  interface Window {
    VANTA?: { GLOBE: (options: Record<string, unknown>) => VantaEffect };
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vantaBackground', { static: true }) vantaBackground!: ElementRef<HTMLElement>;
  isLoginPage = /^\/login\/?$/.test(window.location.pathname);
  isLogoutPage = /^\/logout\/?$/.test(window.location.pathname);
  get hideNavigation(): boolean { return this.isLoginPage || this.isLogoutPage; }
  private vantaEffect?: VantaEffect;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.isLoginPage = /^\/login\/?$/.test(event.urlAfterRedirects.split(/[?#]/)[0]);
      this.isLogoutPage = /^\/logout\/?$/.test(event.urlAfterRedirects.split(/[?#]/)[0]);
      this.applyRouteTheme();
    });
  }

  ngAfterViewInit(): void {
    this.updateBackgroundForTheme();
  }

  private applyRouteTheme(): void {
    let theme: 'dark' | 'light';
    if (this.hideNavigation) {
      theme = 'dark';
    } else {
      let savedTheme: string | null = null;
      try { savedTheme = localStorage.getItem('theme'); } catch { /* Storage may be unavailable. */ }
      theme = savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
  }

  @HostListener('window:app-theme-change')
  updateBackgroundForTheme(): void {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!isDark) {
      this.vantaEffect?.destroy();
      this.vantaEffect = undefined;
      return;
    }

    if (!window.VANTA?.GLOBE || this.vantaEffect) return;
    this.vantaEffect = window.VANTA.GLOBE({
      el: this.vantaBackground.nativeElement,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0x8c3fff
    });
  }

  ngOnDestroy(): void { this.vantaEffect?.destroy(); }
}
