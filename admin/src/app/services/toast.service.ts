import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private next = 0;

  success(message: string) { this._show(message, 'success', 3500); }
  error(message: string)   { this._show(message, 'error',   5000); }
  info(message: string)    { this._show(message, 'info',    3500); }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  private _show(message: string, type: ToastType, duration: number) {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
