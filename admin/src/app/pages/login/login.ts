import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-box">
        <div class="login-logo">Bonton Admin</div>
        <form (ngSubmit)="submit()">
          <div class="field">
            <label>E-mail</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="username">
          </div>
          <div class="field">
            <label>Jelszó</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password">
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Belépés...' : 'Belépés' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
    .login-box {
      background: #fff;
      padding: 2.5rem;
      width: 360px;
      box-shadow: 0 2px 12px rgba(0,0,0,.08);
    }
    .login-logo {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 2rem;
      color: #07102e;
    }
    .field {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }
    label {
      font-size: .75rem;
      font-weight: 600;
      color: #666;
      margin-bottom: .35rem;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    input {
      border: 1px solid #ddd;
      padding: .65rem .85rem;
      font-size: .95rem;
      outline: none;
      transition: border-color .2s;
    }
    input:focus { border-color: #07102e; }
    button {
      width: 100%;
      padding: .75rem;
      background: #07102e;
      color: #fff;
      border: none;
      font-size: .85rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: .5rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    button:disabled { opacity: .6; cursor: default; }
    .error { color: #c00; font-size: .82rem; margin: .5rem 0; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService) {}

  async submit() {
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
    } catch (e: any) {
      this.error = 'Hibás e-mail vagy jelszó.';
    } finally {
      this.loading = false;
    }
  }
}
