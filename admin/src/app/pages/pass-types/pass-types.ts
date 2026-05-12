import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface PassType {
  id: string;
  name: string;
  type: 'havi' | 'alkalom';
  price: number;
  description: string;
  active: boolean;
  sort_order: number;
}

@Component({
  selector: 'app-pass-types',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Bérlettípusok</h1>
        <button class="btn-primary" (click)="openNew()">+ Új bérlet</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="pt-list">
          @for (p of passes(); track p.id) {
            <div class="pt-row" [class.inactive]="!p.active">
              <div class="pt-badge" [class]="p.type === 'havi' ? 'badge-havi' : 'badge-alkalom'">
                {{ p.type === 'havi' ? 'Havi' : 'Alkalom' }}
              </div>
              <div class="pt-body">
                <div class="pt-name">{{ p.name }}</div>
                @if (p.description) { <div class="pt-desc">{{ p.description }}</div> }
              </div>
              <div class="pt-price">{{ p.price | number }} Ft</div>
              <div class="pt-status">
                <span class="status-dot" [class.active]="p.active"></span>
                {{ p.active ? 'Aktív' : 'Inaktív' }}
              </div>
              <div class="pt-actions">
                <button class="btn-edit" (click)="openEdit(p)">Szerk.</button>
                <button class="btn-del" (click)="deletePass(p.id)">Törlés</button>
              </div>
            </div>
          } @empty {
            <p class="info">Még nincs bérlettípus felvéve.</p>
          }
        </div>
      }
    </div>

    @if (showForm()) {
      <div class="modal-bg" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingId() ? 'Bérlet szerkesztése' : 'Új bérlettípus' }}</h2>
            <button class="close" (click)="closeForm()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="field">
              <label>Megnevezés <span class="req">*</span></label>
              <input type="text" formControlName="name" placeholder="pl. Havi bérlet">
            </div>
            <div class="field">
              <label>Típus <span class="req">*</span></label>
              <div class="type-picker">
                <button type="button" class="type-btn"
                  [class.active]="form.get('type')!.value === 'havi'"
                  (click)="form.get('type')!.setValue('havi')">
                  Havi
                </button>
                <button type="button" class="type-btn"
                  [class.active]="form.get('type')!.value === 'alkalom'"
                  (click)="form.get('type')!.setValue('alkalom')">
                  Alkalom (magánóra)
                </button>
              </div>
            </div>
            <div class="field">
              <label>Ár (Ft) <span class="req">*</span></label>
              <input type="number" formControlName="price" placeholder="pl. 12000">
            </div>
            <div class="field">
              <label>Leírás</label>
              <textarea formControlName="description" rows="2" placeholder="Rövid leírás..."></textarea>
            </div>
            <div class="field">
              <label>Sorrend</label>
              <input type="number" formControlName="sort_order">
            </div>
            <div class="field-row">
              <label class="toggle-label">
                <input type="checkbox" formControlName="active">
                <span>Aktív (látható az oldalon)</span>
              </label>
            </div>
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
  `,
  styles: [`
    .page { max-width: 860px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .pt-list { display: flex; flex-direction: column; gap: .5rem; }
    .pt-row {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px;
    }
    .pt-row.inactive { opacity: .5; }
    .pt-badge {
      font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
      padding: .25rem .65rem; border-radius: 2px; white-space: nowrap; flex-shrink: 0;
    }
    .badge-havi   { background: rgba(224,0,255,.1); color: #c400e0; }
    .badge-alkalom { background: rgba(7,16,46,.08); color: #07102e; }
    .pt-body { flex: 1; min-width: 0; }
    .pt-name { font-size: .9rem; font-weight: 600; color: #07102e; }
    .pt-desc { font-size: .75rem; color: #888; margin-top: .15rem; }
    .pt-price { font-size: .95rem; font-weight: 700; color: #07102e; white-space: nowrap; flex-shrink: 0; }
    .pt-status { display: flex; align-items: center; gap: .4rem; font-size: .72rem; color: #888; white-space: nowrap; flex-shrink: 0; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #ddd; }
    .status-dot.active { background: #22c55e; }
    .pt-actions { display: flex; gap: .35rem; flex-shrink: 0; }

    .btn-edit, .btn-del {
      font-size: .7rem; padding: .25rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }

    .btn-primary {
      display: inline-flex; align-items: center; gap: .5rem;
      background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem;
      font-size: .82rem; font-weight: 700; cursor: pointer; letter-spacing: .05em; border-radius: 2px;
    }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost { background: #fff; color: #333; border: 1px solid #ddd; padding: .6rem 1.2rem; font-size: .82rem; cursor: pointer; border-radius: 2px; }

    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; width: 460px; max-height: 90vh; overflow-y: auto; padding: 2rem; border-radius: 4px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.05rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }

    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    input[type=text], input[type=number], textarea, select {
      border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem;
      outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit;
    }
    input:focus, textarea:focus { border-color: #07102e; }
    textarea { resize: vertical; }

    .type-picker { display: flex; gap: .5rem; }
    .type-btn {
      flex: 1; padding: .55rem; border: 1px solid #ddd; background: #fff;
      font-size: .82rem; font-weight: 600; cursor: pointer; border-radius: 2px;
      color: #555; transition: border-color .15s, color .15s, background .15s;
    }
    .type-btn:hover { border-color: #07102e; color: #07102e; }
    .type-btn.active { background: #07102e; color: #fff; border-color: #07102e; }

    .field-row { margin-bottom: 1rem; }
    .toggle-label { display: flex; align-items: center; gap: .6rem; cursor: pointer; font-size: .85rem; font-weight: 500; color: #333; text-transform: none; letter-spacing: 0; }
    .toggle-label input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: #07102e; }

    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .55s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info { color: #888; font-size: .85rem; }
  `]
})
export class PassTypesComponent implements OnInit {
  passes = signal<PassType[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      type:        ['havi', Validators.required],
      price:       [null, [Validators.required, Validators.min(0)]],
      description: [''],
      active:      [true],
      sort_order:  [0],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('pass_types').select('*').order('sort_order').order('type');
    this.passes.set(data ?? []);
    this.loading.set(false);
  }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ type: 'havi', active: true, sort_order: 0 });
    this.showForm.set(true);
  }

  openEdit(p: PassType) {
    this.editingId.set(p.id);
    this.form.patchValue(p);
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('pass_types').update(val).eq('id', id)
      : await this.sb.client.from('pass_types').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeForm(); await this.load(); this.toast.success('Bérlettípus elmentve'); }
    this.saving.set(false);
  }

  async deletePass(id: string) {
    if (!confirm('Biztosan törlöd?')) return;
    await this.sb.client.from('pass_types').delete().eq('id', id);
    await this.load();
    this.toast.info('Bérlettípus törölve');
  }
}
