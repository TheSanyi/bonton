import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

interface Dance {
  id: string;
  sort_order: number;
  name: string;
  level: string;
  level_badge: string;
  description: string;
  weekly_hours: string;
}

const LEVELS = [
  { level: 'Minden szint', level_badge: 'lb-all' },
  { level: 'Kezdőknek',   level_badge: 'lb-k' },
  { level: 'Haladóknak',  level_badge: 'lb-h' },
];

@Component({
  selector: 'app-dances',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Táncok</h1>
        <button class="btn-primary" (click)="openNew()">+ Új tánc</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <table class="dance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tánc</th>
              <th>Szint</th>
              <th>Leírás</th>
              <th>Heti órák</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of dances(); track d.id) {
              <tr>
                <td class="td-order">{{ d.sort_order }}</td>
                <td class="td-name">{{ d.name }}</td>
                <td><span class="lvl-badge" [class]="d.level_badge">{{ d.level }}</span></td>
                <td class="td-desc">{{ d.description }}</td>
                <td class="td-hours">{{ d.weekly_hours }}</td>
                <td class="td-actions">
                  <button class="btn-edit" (click)="openEdit(d)">Szerk.</button>
                  <button class="btn-del" (click)="deleteDance(d.id)">Törlés</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="info">Még nincs tánc felvéve.</td></tr>
            }
          </tbody>
        </table>
      }

      @if (showForm()) {
        <div class="modal-bg" (click)="closeForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingId() ? 'Tánc szerkesztése' : 'Új tánc' }}</h2>
              <button class="close" (click)="closeForm()">✕</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-row">
                <div class="field">
                  <label>Tánc neve</label>
                  <input type="text" formControlName="name" placeholder="pl. Salsa">
                </div>
                <div class="field">
                  <label>Sorrend</label>
                  <input type="number" formControlName="sort_order">
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Szint</label>
                  <select (change)="onLevelChange($event)">
                    @for (l of levels; track l.level_badge) {
                      <option [value]="l.level" [selected]="form.value.level === l.level">{{ l.level }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Heti órák</label>
                  <input type="text" formControlName="weekly_hours" placeholder="pl. 2×/hét">
                </div>
              </div>
              <div class="field">
                <label>Leírás</label>
                <textarea formControlName="description" rows="3" placeholder="Rövid leírás a táncról..."></textarea>
              </div>
              @if (error()) { <p class="error">{{ error() }}</p> }
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="closeForm()">Mégse</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
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
    .page { max-width: 1000px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .dance-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e5e5; }
    .dance-table thead th {
      font-size: .7rem; letter-spacing: .1em; text-transform: uppercase;
      color: #888; font-weight: 700; padding: .75rem 1rem; text-align: left;
      border-bottom: 2px solid #e5e5e5; background: #fafafa;
    }
    .dance-table tbody tr { border-bottom: 1px solid #f0f0f0; transition: background .15s; }
    .dance-table tbody tr:hover { background: #fafafa; }
    .dance-table tbody td { padding: .9rem 1rem; vertical-align: middle; font-size: .88rem; }
    .td-order { color: #aaa; width: 40px; }
    .td-name { font-weight: 700; color: #07102e; }
    .td-desc { color: #555; font-size: .82rem; max-width: 320px; }
    .td-hours { color: #888; white-space: nowrap; }
    .td-actions { white-space: nowrap; }

    .lvl-badge {
      font-size: .65rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      padding: .22rem .7rem; display: inline-block; border-radius: 2px;
    }
    .lb-all { border: 1px solid #aaa; color: #666; }
    .lb-k   { border: 1px solid #ff2d8b; color: #c0006a; }
    .lb-h   { border: 1px solid #e000ff; color: #9b00c9; }

    .btn-edit, .btn-del {
      font-size: .7rem; padding: .22rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px; margin-left: .3rem;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }

    .btn-primary { background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem; font-size: .82rem; font-weight: 700; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost { background: #fff; color: #333; border: 1px solid #ddd; padding: .6rem 1.4rem; font-size: .82rem; cursor: pointer; }

    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; width: 500px; max-height: 90vh; overflow-y: auto; padding: 2rem; border-radius: 4px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    input, select, textarea { border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem; outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit; }
    input:focus, select:focus, textarea:focus { border-color: #07102e; }
    textarea { resize: vertical; }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
    .error { color: #c00; font-size: .82rem; margin: .5rem 0; }
    .info { color: #666; font-size: .9rem; }
  `]
})
export class DancesComponent implements OnInit {
  dances = signal<Dance[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal('');
  levels = LEVELS;
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name:         ['', Validators.required],
      sort_order:   [0],
      level:        [LEVELS[0].level],
      level_badge:  [LEVELS[0].level_badge],
      weekly_hours: [''],
      description:  [''],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('dances').select('*').order('sort_order');
    this.dances.set(data ?? []);
    this.loading.set(false);
  }

  onLevelChange(e: globalThis.Event) {
    const level = (e.target as HTMLSelectElement).value;
    const opt = LEVELS.find(l => l.level === level)!;
    this.form.patchValue({ level: opt.level, level_badge: opt.level_badge });
  }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ sort_order: this.dances().length + 1, level: LEVELS[0].level, level_badge: LEVELS[0].level_badge });
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(d: Dance) {
    this.editingId.set(d.id);
    this.form.patchValue(d);
    this.error.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value;
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('dances').update(val).eq('id', id)
      : await this.sb.client.from('dances').insert(val);
    if (error) { this.error.set(error.message); }
    else { this.closeForm(); await this.load(); }
    this.saving.set(false);
  }

  async deleteDance(id: string) {
    if (!confirm('Biztosan törlöd ezt a táncot?')) return;
    await this.sb.client.from('dances').delete().eq('id', id);
    await this.load();
  }
}
