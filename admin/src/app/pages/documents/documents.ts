import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Document {
  id: string;
  title: string;
  category: string;
  year: number | null;
  file_url: string;
  file_name: string;
  sort_order: number;
}

const CATEGORIES = [
  'Alapszabály',
  'Közhasznúsági jelentés',
  'Pénzügyi beszámoló',
  'Adatkezelési tájékoztató',
  'Egyéb',
];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Dokumentumok</h1>
        <button class="btn-primary" (click)="openNew()">+ Feltöltés</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="doc-list">
          @for (d of docs(); track d.id) {
            <div class="doc-row">
              <div class="doc-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="doc-body">
                <div class="doc-title">{{ d.title }}</div>
                <div class="doc-meta">
                  <span class="doc-cat">{{ d.category }}</span>
                  @if (d.year) { <span class="doc-year">{{ d.year }}</span> }
                </div>
              </div>
              <a [href]="d.file_url" target="_blank" class="btn-dl">Megnyitás</a>
              <div class="doc-actions">
                <button class="btn-edit" (click)="openEdit(d)">Szerk.</button>
                <button class="btn-del" (click)="deleteDoc(d)">Törlés</button>
              </div>
            </div>
          } @empty {
            <p class="info">Még nincs feltöltött dokumentum.</p>
          }
        </div>
      }
    </div>

    @if (showForm()) {
      <div class="modal-bg" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingId() ? 'Dokumentum szerkesztése' : 'Új dokumentum' }}</h2>
            <button class="close" (click)="closeForm()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">

            @if (!editingId()) {
              <div class="field">
                <label>Fájl <span class="req">*</span></label>
                <label class="btn-upload" [class.disabled]="uploading()">
                  @if (uploading()) { <span class="btn-spinner-dark"></span> }
                  {{ uploading() ? 'Feltöltés...' : (fileName() || 'Fájl kiválasztása') }}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods" (change)="onFileChange($event)" [disabled]="uploading()">
                </label>
              </div>
            }

            <div class="field">
              <label>Megnevezés <span class="req">*</span></label>
              <input type="text" formControlName="title" placeholder="pl. Alapszabály">
            </div>

            <div class="field">
              <label>Kategória <span class="req">*</span></label>
              <select formControlName="category">
                <option value="" disabled>Válassz...</option>
                @for (c of categories; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label>Év</label>
              <input type="number" formControlName="year" placeholder="pl. 2024">
            </div>

            <div class="field">
              <label>Sorrend</label>
              <input type="number" formControlName="sort_order">
            </div>

            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="closeForm()">Mégse</button>
              <button type="submit" class="btn-primary" [disabled]="saving() || uploading() || (!editingId() && !form.value.file_url)">
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
    .page { max-width: 900px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .doc-list { display: flex; flex-direction: column; gap: .5rem; }
    .doc-row {
      display: flex; align-items: center; gap: 1rem;
      padding: .9rem 1.1rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px;
    }
    .doc-icon { color: #e000ff; flex-shrink: 0; display: flex; }
    .doc-body { flex: 1; min-width: 0; }
    .doc-title { font-size: .88rem; font-weight: 600; color: #07102e; margin-bottom: .25rem; }
    .doc-meta { display: flex; gap: .5rem; align-items: center; }
    .doc-cat {
      font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      color: #e000ff; background: rgba(224,0,255,.08); padding: .15rem .5rem; border-radius: 2px;
    }
    .doc-year { font-size: .7rem; color: #aaa; }
    .doc-actions { display: flex; gap: .35rem; flex-shrink: 0; }
    .btn-dl {
      font-size: .7rem; padding: .3rem .7rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px; text-decoration: none;
      color: #07102e; white-space: nowrap; flex-shrink: 0;
    }
    .btn-dl:hover { background: #f5f5f5; }
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
    .req { color: #c00; }
    input, select {
      border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem;
      outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit;
      background: #fff;
    }
    input:focus, select:focus { border-color: #07102e; }

    .btn-upload {
      display: flex; align-items: center; gap: .5rem;
      padding: .6rem .9rem; background: #f5f5f5; border: 1px solid #ddd;
      font-size: .78rem; cursor: pointer; border-radius: 2px; font-weight: 600;
      color: #333; text-transform: none; letter-spacing: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .btn-upload input[type=file] { display: none; }
    .btn-upload:hover { background: #eee; }
    .btn-upload.disabled { opacity: .6; cursor: default; }
    .btn-spinner-dark { display: inline-block; width: 10px; height: 10px; border: 2px solid rgba(0,0,0,.2); border-top-color: #333; border-radius: 50%; animation: spin .55s linear infinite; }

    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: .5rem; }
    .btn-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .55s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info { color: #888; font-size: .85rem; }
  `]
})
export class DocumentsComponent implements OnInit {
  docs = signal<Document[]>([]);
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  fileName = signal('');
  categories = CATEGORIES;
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      title:      ['', Validators.required],
      category:   ['', Validators.required],
      year:       [null],
      sort_order: [0],
      file_url:   [''],
      file_name:  [''],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('documents').select('*').order('category').order('sort_order').order('year', { ascending: false });
    this.docs.set(data ?? []);
    this.loading.set(false);
  }

  openNew() {
    this.editingId.set(null);
    this.fileName.set('');
    this.form.reset({ sort_order: 0 });
    this.showForm.set(true);
  }

  openEdit(d: Document) {
    this.editingId.set(d.id);
    this.fileName.set(d.file_name ?? '');
    this.form.patchValue(d);
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  async onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await this.sb.client.storage.from('documents').upload(path, file);
    if (error) { this.toast.error('Feltöltési hiba: ' + error.message); this.uploading.set(false); return; }
    const { data } = this.sb.client.storage.from('documents').getPublicUrl(path);
    this.form.patchValue({ file_url: data.publicUrl, file_name: file.name });
    this.fileName.set(file.name);
    if (!this.form.value.title) this.form.patchValue({ title: file.name.replace(/\.[^.]+$/, '') });
    this.uploading.set(false);
    this.toast.success('Fájl feltöltve');
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = { ...this.form.value, year: this.form.value.year || null };
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('documents').update(val).eq('id', id)
      : await this.sb.client.from('documents').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeForm(); await this.load(); this.toast.success('Dokumentum elmentve'); }
    this.saving.set(false);
  }

  async deleteDoc(d: Document) {
    if (!confirm(`Biztosan törlöd: ${d.title}?`)) return;
    const path = d.file_url.split('/documents/')[1];
    if (path) await this.sb.client.storage.from('documents').remove([path]);
    await this.sb.client.from('documents').delete().eq('id', d.id);
    await this.load();
    this.toast.info('Dokumentum törölve');
  }
}
