import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Dance {
  id: string;
  sort_order: number;
  name: string;
  description: string;
  image_url: string;
}

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
              <th>Kép</th>
              <th>Leírás / Történet</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of dances(); track d.id) {
              <tr>
                <td class="td-order">{{ d.sort_order }}</td>
                <td class="td-name">{{ d.name }}</td>
                <td class="td-img">
                  @if (d.image_url) {
                    <img [src]="d.image_url" alt="" class="thumb">
                  } @else {
                    <span class="no-img">—</span>
                  }
                </td>
                <td class="td-desc">{{ d.description }}</td>
                <td class="td-actions">
                  <button class="btn-edit" (click)="openEdit(d)">Szerk.</button>
                  <button class="btn-del" (click)="deleteDance(d.id)">Törlés</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="info">Még nincs tánc felvéve.</td></tr>
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
                  <label>Tánc neve <span class="req">*</span></label>
                  <input type="text" formControlName="name" placeholder="pl. Salsa">
                </div>
                <div class="field">
                  <label>Sorrend</label>
                  <input type="number" formControlName="sort_order">
                </div>
              </div>
              <div class="field">
                <label>Kép</label>
                <div class="img-upload-wrap">
                  @if (previewUrl()) {
                    <img [src]="previewUrl()!" class="img-preview" alt="preview">
                  } @else {
                    <div class="img-placeholder">Nincs kép</div>
                  }
                  <div class="img-actions">
                    <label class="btn-upload" [class.disabled]="uploading()">
                      @if (uploading()) { <span class="btn-spinner-dark"></span> }
                      {{ uploading() ? 'Feltöltés...' : 'Kép kiválasztása' }}
                      <input type="file" accept="image/*" (change)="onFileChange($event)" [disabled]="uploading()">
                    </label>
                    @if (previewUrl()) {
                      <button type="button" class="btn-del-img" (click)="removeImage()">Kép törlése</button>
                    }
                  </div>
                </div>
              </div>
              <div class="field">
                <label>Leírás / Történet</label>
                <textarea formControlName="description" rows="5" placeholder="A tánc eredete, története, jellemzői..."></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="closeForm()">Mégse</button>
                <button type="submit" class="btn-primary" [disabled]="saving() || uploading()">
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
    .td-name { font-weight: 700; color: #07102e; white-space: nowrap; }
    .td-img { width: 80px; }
    .thumb { width: 72px; height: 48px; object-fit: cover; display: block; border-radius: 2px; }
    .no-img { color: #ccc; }
    .td-desc { color: #555; font-size: .82rem; max-width: 480px; }
    .td-actions { white-space: nowrap; }

    .img-upload-wrap { display: flex; gap: 1rem; align-items: flex-start; }
    .img-preview { width: 100px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
    .img-placeholder { width: 100px; height: 100px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: .75rem; color: #aaa; }
    .img-actions { display: flex; flex-direction: column; gap: .5rem; }
    .btn-upload { display: inline-flex; align-items: center; padding: .5rem .9rem; background: #f5f5f5; border: 1px solid #ddd; font-size: .78rem; cursor: pointer; border-radius: 2px; font-weight: 600; }
    .btn-upload input[type=file] { display: none; }
    .btn-upload:hover { background: #eee; }
    .btn-upload.disabled { opacity: .6; cursor: default; }
    .btn-del-img { padding: .4rem .9rem; background: #fff; border: 1px solid #f0c0c0; color: #c00; font-size: .75rem; cursor: pointer; border-radius: 2px; }
    .btn-spinner-dark { display: inline-block; width: 10px; height: 10px; border: 2px solid rgba(0,0,0,.2); border-top-color: #333; border-radius: 50%; animation: spin .55s linear infinite; margin-right: .4rem; }

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
  uploading = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal('');
  previewUrl = signal<string | null>(null);
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      sort_order:  [0],
      image_url:   [null],
      description: [''],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('dances').select('*').order('sort_order');
    this.dances.set(data ?? []);
    this.loading.set(false);
  }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ sort_order: this.dances().length + 1 });
    this.previewUrl.set(null);
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(d: Dance) {
    this.editingId.set(d.id);
    this.form.patchValue(d);
    this.previewUrl.set(d.image_url);
    this.error.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  removeImage() {
    this.previewUrl.set(null);
    this.form.patchValue({ image_url: null });
  }

  async onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await this.sb.client.storage.from('dance-images').upload(path, file);
    if (error) {
      this.error.set('Feltöltési hiba: ' + error.message);
      this.uploading.set(false);
      return;
    }
    const { data } = this.sb.client.storage.from('dance-images').getPublicUrl(path);
    this.previewUrl.set(data.publicUrl);
    this.form.patchValue({ image_url: data.publicUrl });
    this.uploading.set(false);
    this.toast.success('Kép feltöltve');
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value;
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('dances').update(val).eq('id', id)
      : await this.sb.client.from('dances').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeForm(); await this.load(); this.toast.success('Tánc elmentve'); }
    this.saving.set(false);
  }

  async deleteDance(id: string) {
    if (!confirm('Biztosan törlöd ezt a táncot?')) return;
    await this.sb.client.from('dances').delete().eq('id', id);
    await this.load();
    this.toast.info('Tánc törölve');
  }
}
