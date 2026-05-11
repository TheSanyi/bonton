import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Slot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  name: string;
  meta: string;
  badge: string;
  badge_label: string;
  sort_order: number;
}

const DAYS = [
  { value: 'hetfo',    label: 'Hétfő' },
  { value: 'kedd',     label: 'Kedd' },
  { value: 'szerda',   label: 'Szerda' },
  { value: 'csutortok',label: 'Csütörtök' },
  { value: 'pentek',   label: 'Péntek' },
];

const BADGE_OPTIONS = [
  { badge: 'sb-h', badge_label: 'Haladó' },
  { badge: 'sb-k', badge_label: 'Kezdő' },
  { badge: 'sb-g', badge_label: 'Gyermek' },
  { badge: 'sb-p', badge_label: 'Vegyes' },
  { badge: 'sb-e', badge_label: 'Egyéni' },
];

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Órarend</h1>
        <button class="btn-primary" (click)="openNew()">+ Új óra</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="days-grid">
          @for (day of days; track day.value) {
            <div class="day-col">
              <div class="day-title">{{ day.label }}</div>
              <div class="slots">
                @for (slot of slotsForDay(day.value); track slot.id) {
                  <div class="slot-card">
                    <div class="slot-time">{{ fmt(slot.start_time) }} – {{ fmt(slot.end_time) }}</div>
                    <div class="slot-name">{{ slot.name }}</div>
                    @if (slot.meta) {
                      <div class="slot-meta">{{ slot.meta }}</div>
                    }
                    <span class="badge" [class]="slot.badge">{{ slot.badge_label }}</span>
                    <div class="slot-actions">
                      <button class="btn-edit" (click)="openEdit(slot)">Szerkesztés</button>
                      <button class="btn-del" (click)="deleteSlot(slot.id)">Törlés</button>
                    </div>
                  </div>
                } @empty {
                  <p class="empty">Nincs óra</p>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showForm()) {
        <div class="modal-bg" (click)="closeForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingId() ? 'Óra szerkesztése' : 'Új óra' }}</h2>
              <button class="close" (click)="closeForm()">✕</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-row">
                <div class="field">
                  <label>Nap <span class="req">*</span></label>
                  <select formControlName="day">
                    @for (d of days; track d.value) {
                      <option [value]="d.value">{{ d.label }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Sorrend</label>
                  <input type="number" formControlName="sort_order">
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Kezdés <span class="req">*</span></label>
                  <input type="time" formControlName="start_time">
                </div>
                <div class="field">
                  <label>Befejezés <span class="req">*</span></label>
                  <input type="time" formControlName="end_time">
                </div>
              </div>
              <div class="field">
                <label>Megnevezés <span class="req">*</span></label>
                <input type="text" formControlName="name" placeholder="pl. Latin technika haladó">
              </div>
              <div class="field">
                <label>Részletek <span class="hint">(korosztály / megjegyzés)</span></label>
                <input type="text" formControlName="meta" placeholder="pl. Gyermek / Junior">
              </div>
              <div class="field">
                <label>Szint / badge</label>
                <select (change)="onBadgeChange($event)">
                  @for (b of badgeOptions; track b.badge_label) {
                    <option [value]="b.badge_label" [selected]="form.value.badge_label === b.badge_label">
                      {{ b.badge_label }}
                    </option>
                  }
                </select>
              </div>
              @if (error()) {
                <p class="error">{{ error() }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="closeForm()">Mégse</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  @if (saving()) { <span class="btn-spinner"></span> }
                  {{ saving() ? 'Mentés...' : 'Mentés' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .days-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
    .day-col {}
    .day-title {
      font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
      color: #07102e; padding: .6rem 0; border-bottom: 2px solid #07102e; margin-bottom: .75rem;
    }
    .slots { display: flex; flex-direction: column; gap: .5rem; }
    .slot-card {
      background: #fff; padding: .85rem; border: 1px solid #e5e5e5;
      border-radius: 4px; font-size: .82rem;
    }
    .slot-time { font-size: .72rem; color: #888; margin-bottom: .2rem; font-weight: 600; }
    .slot-name { font-weight: 600; color: #07102e; margin-bottom: .15rem; }
    .slot-meta { font-size: .75rem; color: #666; margin-bottom: .35rem; }
    .badge {
      display: inline-block; font-size: .65rem; font-weight: 700;
      padding: .15rem .5rem; border-radius: 2px; margin-bottom: .5rem;
    }
    .sb-h { background: rgba(224,0,255,.15); color: #9b00c9; }
    .sb-k { background: rgba(251,146,60,.15); color: #c2410c; }
    .sb-g { background: rgba(34,197,94,.15);  color: #15803d; }
    .sb-p { background: rgba(234,179,8,.15); color: #854d0e; }
    .sb-e { background: rgba(96,165,250,.15); color: #1d4ed8; }
    .slot-actions { display: flex; gap: .4rem; margin-top: .4rem; }
    .btn-edit, .btn-del {
      font-size: .7rem; padding: .25rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }
    .empty { font-size: .8rem; color: #aaa; font-style: italic; }

    /* FORM */
    .btn-primary {
      background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem;
      font-size: .82rem; font-weight: 700; cursor: pointer; letter-spacing: .06em;
    }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost {
      background: #fff; color: #333; border: 1px solid #ddd; padding: .6rem 1.4rem;
      font-size: .82rem; cursor: pointer;
    }
    .modal-bg {
      position: fixed; inset: 0; background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .modal {
      background: #fff; width: 480px; max-height: 90vh; overflow-y: auto;
      padding: 2rem; border-radius: 4px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    .hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
    input, select {
      border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem;
      outline: none; border-radius: 2px; transition: border-color .15s;
    }
    input:focus, select:focus { border-color: #07102e; }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
    .error { color: #c00; font-size: .82rem; margin: .5rem 0; }
    .info { color: #666; font-size: .9rem; }
  `]
})
export class ScheduleComponent implements OnInit {
  slots = signal<Slot[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal('');

  days = DAYS;
  badgeOptions = BADGE_OPTIONS;
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      day:         ['hetfo', Validators.required],
      start_time:  ['', Validators.required],
      end_time:    ['', Validators.required],
      name:        ['', Validators.required],
      meta:        [''],
      badge:       ['sb-h'],
      badge_label: ['Haladó'],
      sort_order:  [0],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client
      .from('schedule')
      .select('*')
      .order('sort_order')
      .order('start_time');
    this.slots.set(data ?? []);
    this.loading.set(false);
  }

  slotsForDay(day: string) {
    return this.slots().filter(s => s.day === day);
  }

  fmt(t: string) { return t?.slice(0, 5) ?? ''; }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ day: 'hetfo', badge: 'sb-h', badge_label: 'Haladó', sort_order: 0 });
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(slot: Slot) {
    this.editingId.set(slot.id);
    this.form.patchValue(slot);
    this.error.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  onBadgeChange(e: Event) {
    const label = (e.target as HTMLSelectElement).value;
    const opt = BADGE_OPTIONS.find(b => b.badge_label === label)!;
    this.form.patchValue({ badge: opt.badge, badge_label: opt.badge_label });
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value;
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('schedule').update(val).eq('id', id)
      : await this.sb.client.from('schedule').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeForm(); await this.load(); this.toast.success('Óra elmentve'); }
    this.saving.set(false);
  }

  async deleteSlot(id: string) {
    if (!confirm('Biztosan törlöd ezt az órát?')) return;
    await this.sb.client.from('schedule').delete().eq('id', id);
    await this.load();
    this.toast.info('Óra törölve');
  }
}
