import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DarkModeService {
  dark = signal(localStorage.getItem('admin-dark') === '1');

  constructor() { this.apply(); }

  toggle() {
    this.dark.update(v => !v);
    localStorage.setItem('admin-dark', this.dark() ? '1' : '0');
    this.apply();
  }

  private apply() {
    document.body.classList.toggle('dark', this.dark());
  }
}
