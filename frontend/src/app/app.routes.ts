import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TrackerComponent } from './pages/tracker/tracker.component';
import { LogoutComponent } from './pages/logout/logout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'sections/new',
    loadComponent: () => import('./pages/section-editor/section-editor.component')
      .then(component => component.SectionEditorComponent), canActivate: [authGuard]
  },
  {
    path: 'sections/:id/edit',
    loadComponent: () => import('./pages/section-editor/section-editor.component')
      .then(component => component.SectionEditorComponent), canActivate: [authGuard]
  },
  {
    path: 'courses/:id',
    loadComponent: () => import('./pages/course-details/course-details.component')
      .then(component => component.CourseDetailsComponent), canActivate: [authGuard]
  },
  { path: 'tracker', component: TrackerComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
