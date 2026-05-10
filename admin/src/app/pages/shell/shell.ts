import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const NAV = [
  { path: 'schedule', label: 'Órarend' },
  { path: 'teachers', label: 'Tanárok' },
  { path: 'events',   label: 'Események' },
  { path: 'dances',   label: 'Táncok' },
  { path: 'gallery',  label: 'Galéria' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">Bonton Admin</div>
        <nav>
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>
        <button class="logout" (click)="auth.logout()">Kijelentkezés</button>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: 220px;
      background: #07102e;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding: 1.5rem 0;
    }
    .sidebar-logo {
      color: #fff;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 0 1.5rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,.1);
      margin-bottom: 1rem;
    }
    nav { display: flex; flex-direction: column; flex: 1; }
    nav a {
      color: rgba(255,255,255,.6);
      text-decoration: none;
      padding: .75rem 1.5rem;
      font-size: .88rem;
      font-weight: 500;
      transition: background .15s, color .15s;
    }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(255,255,255,.1); color: #fff; }
    .logout {
      margin: 1rem 1.5rem 0;
      padding: .6rem;
      background: transparent;
      border: 1px solid rgba(255,255,255,.2);
      color: rgba(255,255,255,.5);
      font-size: .8rem;
      cursor: pointer;
      transition: border-color .15s, color .15s;
    }
    .logout:hover { border-color: rgba(255,255,255,.5); color: #fff; }
    .content { flex: 1; background: #f5f5f5; padding: 2.5rem; overflow-y: auto; }
  `]
})
export class ShellComponent {
  nav = NAV;
  constructor(public auth: AuthService) {}
}
