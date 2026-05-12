import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./pages/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'schedule', loadComponent: () => import('./pages/schedule/schedule').then(m => m.ScheduleComponent) },
      { path: 'teachers', loadComponent: () => import('./pages/teachers/teachers').then(m => m.TeachersComponent) },
      { path: 'events',   loadComponent: () => import('./pages/events/events').then(m => m.EventsComponent) },
      { path: 'dances',   loadComponent: () => import('./pages/dances/dances').then(m => m.DancesComponent) },
      { path: 'gallery',  loadComponent: () => import('./pages/gallery/gallery').then(m => m.GalleryComponent) },
      { path: 'about',    loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent) },
      { path: '', redirectTo: 'schedule', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
