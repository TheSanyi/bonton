import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Purchase {
  id: string;
  buyer_name: string;
  buyer_email: string;
  status: 'pending' | 'paid' | 'failed';
  stripe_session_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  pass_types: { name: string; type: string; price: number };
}

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Vásárlások</h1>
        <div class="header-stats">
          <span class="stat"><span class="stat-n">{{ paidCount() }}</span> fizetve</span>
          <span class="stat pending"><span class="stat-n">{{ pendingCount() }}</span> függőben</span>
        </div>
      </div>

      <div class="filters">
        <div class="filter-tabs">
          @for (f of filters; track f.value) {
            <button class="filter-tab" [class.active]="activeFilter() === f.value" (click)="activeFilter.set(f.value)">
              {{ f.label }}
            </button>
          }
        </div>
        <input class="search" type="text" [(ngModel)]="searchTerm" placeholder="Keresés névre / emailre...">
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="pur-list">
          @for (p of filtered(); track p.id) {
            <div class="pur-row">
              <div class="pur-buyer">
                <div class="pur-name">{{ p.buyer_name }}</div>
                <div class="pur-email">{{ p.buyer_email }}</div>
              </div>
              <div class="pur-pass">
                <div class="pur-pass-name">{{ p.pass_types?.name }}</div>
                <div class="pur-price">{{ p.pass_types?.price | number }} Ft</div>
              </div>
              @if (p.valid_from) {
                <div class="pur-validity">
                  <div class="pur-val-label">Érvényes</div>
                  <div class="pur-val-dates">{{ p.valid_from | date:'MM. dd.' }} – {{ p.valid_until | date:'MM. dd.' }}</div>
                </div>
              } @else {
                <div class="pur-validity"></div>
              }
              <div class="pur-date">{{ p.created_at | date:'yyyy. MM. dd.' }}</div>
              <span class="status-badge" [class]="'s-' + p.status">
                {{ statusLabel(p.status) }}
              </span>
              <div class="pur-actions">
                @if (p.status !== 'paid') {
                  <button class="btn-mark-paid" (click)="markPaid(p)">Fizetve ✓</button>
                }
                @if (p.status === 'paid') {
                  <button class="btn-mark-pending" (click)="markStatus(p, 'pending')">Visszavon</button>
                }
              </div>
            </div>
          } @empty {
            <p class="info">Nincs találat.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .header-stats { display: flex; gap: 1.25rem; }
    .stat { font-size: .78rem; color: #888; }
    .stat-n { font-weight: 700; color: #07102e; font-size: .95rem; margin-right: .25rem; }
    .stat.pending .stat-n { color: #f59e0b; }

    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
    .filter-tabs { display: flex; gap: .35rem; }
    .filter-tab {
      font-size: .72rem; font-weight: 600; padding: .4rem .9rem;
      border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 2px; color: #666;
    }
    .filter-tab.active { background: #07102e; color: #fff; border-color: #07102e; }
    .search {
      border: 1px solid #ddd; padding: .45rem .75rem; font-size: .82rem;
      outline: none; border-radius: 2px; width: 220px; font-family: inherit;
    }
    .search:focus { border-color: #07102e; }

    .pur-list { display: flex; flex-direction: column; gap: .4rem; }
    .pur-row {
      display: flex; align-items: center; gap: 1rem;
      padding: .9rem 1.1rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px;
    }
    .pur-buyer { min-width: 180px; }
    .pur-name { font-size: .88rem; font-weight: 600; color: #07102e; }
    .pur-email { font-size: .72rem; color: #888; margin-top: .1rem; }
    .pur-pass { min-width: 160px; }
    .pur-pass-name { font-size: .82rem; color: #333; }
    .pur-price { font-size: .72rem; color: #888; margin-top: .1rem; }
    .pur-validity { min-width: 120px; }
    .pur-val-label { font-size: .62rem; text-transform: uppercase; letter-spacing: .08em; color: #aaa; }
    .pur-val-dates { font-size: .75rem; color: #555; margin-top: .1rem; }
    .pur-date { font-size: .75rem; color: #aaa; flex-shrink: 0; min-width: 90px; }

    .status-badge {
      font-size: .65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; padding: .25rem .65rem; border-radius: 2px; flex-shrink: 0;
    }
    .s-paid    { background: rgba(34,197,94,.12); color: #16a34a; }
    .s-pending { background: rgba(245,158,11,.12); color: #d97706; }
    .s-failed  { background: rgba(239,68,68,.12);  color: #dc2626; }

    .pur-actions { flex-shrink: 0; display: flex; gap: .35rem; }
    .btn-mark-paid {
      font-size: .7rem; padding: .25rem .65rem; border: 1px solid #bbf7d0;
      background: #f0fdf4; color: #16a34a; cursor: pointer; border-radius: 2px;
      white-space: nowrap;
    }
    .btn-mark-paid:hover { background: #dcfce7; }
    .btn-mark-pending {
      font-size: .7rem; padding: .25rem .65rem; border: 1px solid #ddd;
      background: #fff; color: #888; cursor: pointer; border-radius: 2px;
    }
    .btn-mark-pending:hover { background: #f5f5f5; }

    .info { color: #888; font-size: .85rem; }
  `]
})
export class PurchasesComponent implements OnInit {
  purchases = signal<Purchase[]>([]);
  loading = signal(false);
  activeFilter = signal<string>('all');
  searchTerm = '';

  filters = [
    { label: 'Összes', value: 'all' },
    { label: 'Fizetve',    value: 'paid' },
    { label: 'Függőben',   value: 'pending' },
    { label: 'Sikertelen', value: 'failed' },
  ];

  paidCount    = computed(() => this.purchases().filter(p => p.status === 'paid').length);
  pendingCount = computed(() => this.purchases().filter(p => p.status === 'pending').length);

  filtered = computed(() => {
    let list = this.purchases();
    if (this.activeFilter() !== 'all') list = list.filter(p => p.status === this.activeFilter());
    const q = this.searchTerm.toLowerCase().trim();
    if (q) list = list.filter(p =>
      p.buyer_name.toLowerCase().includes(q) || p.buyer_email.toLowerCase().includes(q)
    );
    return list;
  });

  constructor(private sb: SupabaseService, private toast: ToastService) {}

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client
      .from('purchases')
      .select('*, pass_types(name, type, price)')
      .order('created_at', { ascending: false });
    this.purchases.set(data ?? []);
    this.loading.set(false);
  }

  statusLabel(s: string) {
    return { paid: 'Fizetve', pending: 'Függőben', failed: 'Sikertelen' }[s] ?? s;
  }

  async markPaid(p: Purchase) {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + 30);
    const extra = p.pass_types?.type === 'havi'
      ? { valid_from: now.toISOString().slice(0,10), valid_until: until.toISOString().slice(0,10) }
      : {};
    await this.markStatus(p, 'paid', extra);
  }

  async markStatus(p: Purchase, status: string, extra: object = {}) {
    const { error } = await this.sb.client
      .from('purchases')
      .update({ status, ...extra })
      .eq('id', p.id);
    if (error) { this.toast.error(error.message); return; }
    await this.load();
    this.toast.success(status === 'paid' ? 'Fizetve jelölve' : 'Státusz visszavonva');
  }
}
