import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  loggedIn = signal(false);

  constructor(private sb: SupabaseService, private router: Router) {
    this.sb.client.auth.getSession().then(({ data }) => {
      this.loggedIn.set(!!data.session);
    });
    this.sb.client.auth.onAuthStateChange((_, session) => {
      this.loggedIn.set(!!session);
    });
  }

  async login(email: string, password: string) {
    const { error } = await this.sb.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.router.navigate(['/schedule']);
  }

  async logout() {
    await this.sb.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
