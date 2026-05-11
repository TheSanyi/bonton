import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrap">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.type">
          <span class="toast-icon">{{ icons[t.type] }}</span>
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" (click)="toast.dismiss(t.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .85rem 1rem .85rem 1.1rem;
      background: #1a1f35;
      border-left: 3px solid #555;
      border-radius: 3px;
      box-shadow: 0 4px 20px rgba(0,0,0,.35);
      min-width: 260px;
      max-width: 380px;
      pointer-events: all;
      animation: toast-in .22s ease;
    }
    .toast-success { border-left-color: #16a34a; }
    .toast-error   { border-left-color: #dc2626; }
    .toast-info    { border-left-color: #e000ff; }

    .toast-icon { font-size: .9rem; flex-shrink: 0; }
    .toast-success .toast-icon { color: #16a34a; }
    .toast-error   .toast-icon { color: #dc2626; }
    .toast-info    .toast-icon { color: #e000ff; }

    .toast-msg { font-size: .84rem; color: #dde1f0; line-height: 1.4; flex: 1; font-family: 'Inter', sans-serif; }
    .toast-close {
      background: none; border: none; color: #555; font-size: .8rem;
      cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;
      transition: color .15s;
    }
    .toast-close:hover { color: #aaa; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: none; }
    }
  `]
})
export class ToastComponent {
  icons: Record<string, string> = { success: '✓', error: '✕', info: 'i' };
  constructor(public toast: ToastService) {}
}
