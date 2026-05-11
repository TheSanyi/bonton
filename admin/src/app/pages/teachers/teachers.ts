import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Teacher {
  id: string;
  image_url: string | null;
  name: string;
  role: string;
  bio: string;
  tags: string[];
  sort_order: number;
}

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Tanárok</h1>
        <button class="btn-primary" (click)="openNew()">+ Új tanár</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="cards">
          @for (t of teachers(); track t.id) {
            <div class="card">
              <div class="card-img-wrap">
                @if (t.image_url) {
                  <img [src]="t.image_url" [alt]="t.name" class="card-img">
                } @else {
                  <div class="card-img-placeholder">{{ initials(t.name) }}</div>
                }
              </div>
              <div class="card-body">
                <div class="card-name">{{ t.name }}</div>
                <div class="card-role">{{ t.role }}</div>
                @if (t.bio) { <p class="card-bio">{{ t.bio }}</p> }
                @if (t.tags?.length) {
                  <div class="tags">
                    @for (tag of t.tags; track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                }
                <div class="card-actions">
                  <button class="btn-edit" (click)="openEdit(t)">Szerkesztés</button>
                  <button class="btn-del" (click)="deleteTeacher(t.id)">Törlés</button>
                </div>
              </div>
            </div>
          } @empty {
            <p class="info">Még nincs tanár felvéve.</p>
          }
        </div>
      }

      @if (showForm()) {
        <div class="modal-bg" (click)="closeForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingId() ? 'Tanár szerkesztése' : 'Új tanár' }}</h2>
              <button class="close" (click)="closeForm()">✕</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">

              <div class="field">
                <label>Fotó</label>
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
                <label>Teljes név <span class="req">*</span></label>
                <input type="text" formControlName="name" placeholder="Kovács Ágnes">
              </div>
              <div class="field">
                <label>Szerepkör <span class="req">*</span></label>
                <input type="text" formControlName="role" placeholder="Salsa & Bachata">
              </div>
              <div class="field">
                <label>Bemutatkozás</label>
                <textarea formControlName="bio" rows="4" placeholder="Rövid életrajz..."></textarea>
              </div>
              <div class="field">
                <label>Szakterületek <span class="hint">(Enter = hozzáadás)</span></label>
                <div class="tag-input-wrap">
                  @for (tag of tags(); track tag) {
                    <span class="tag removable">
                      {{ tag }}
                      <button type="button" (click)="removeTag(tag)">✕</button>
                    </span>
                  }
                  <input
                    type="text"
                    class="tag-input"
                    [(ngModel)]="tagInput"
                    [ngModelOptions]="{standalone: true}"
                    (keydown.enter)="addTag($event)"
                    (keydown.comma)="addTag($event)"
                    placeholder="pl. Salsa">
                </div>
              </div>
              <div class="field">
                <label>Sorrend</label>
                <input type="number" formControlName="sort_order">
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
    .page { max-width: 1100px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden; }
    .card-img-wrap { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #f0f0f0; }
    .card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .card-img-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      font-size: 2rem; font-weight: 700; color: #aaa; background: #f5f5f5;
    }
    .card-body { padding: 1.1rem; }
    .card-name { font-weight: 700; font-size: 1rem; color: #07102e; margin-bottom: .2rem; }
    .card-role { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: #e000ff; font-weight: 600; margin-bottom: .6rem; }
    .card-bio { font-size: .82rem; color: #555; line-height: 1.6; margin-bottom: .75rem; }
    .tags { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .75rem; }
    .tag {
      font-size: .7rem; padding: .2rem .55rem; background: rgba(224,0,255,.08);
      color: #9b00c9; border: 1px solid rgba(224,0,255,.2); border-radius: 2px;
    }
    .tag.removable { display: flex; align-items: center; gap: .3rem; }
    .tag.removable button { background: none; border: none; cursor: pointer; color: inherit; font-size: .7rem; padding: 0; }
    .card-actions { display: flex; gap: .4rem; }

    .btn-edit, .btn-del {
      font-size: .7rem; padding: .25rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }

    .btn-primary {
      background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem;
      font-size: .82rem; font-weight: 700; cursor: pointer; letter-spacing: .06em;
    }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost { background: #fff; color: #333; border: 1px solid #ddd; padding: .6rem 1.4rem; font-size: .82rem; cursor: pointer; }

    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; width: 500px; max-height: 90vh; overflow-y: auto; padding: 2rem; border-radius: 4px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }
    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    .hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
    input, textarea { border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem; outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit; }
    input:focus, textarea:focus { border-color: #07102e; }
    textarea { resize: vertical; }

    .img-upload-wrap { display: flex; gap: 1rem; align-items: flex-start; }
    .img-preview { width: 100px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
    .img-placeholder { width: 100px; height: 100px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: .75rem; color: #aaa; }
    .img-actions { display: flex; flex-direction: column; gap: .5rem; }
    .btn-upload {
      display: inline-flex; align-items: center; padding: .5rem .9rem; background: #f5f5f5; border: 1px solid #ddd;
      font-size: .78rem; cursor: pointer; border-radius: 2px; font-weight: 600;
    }
    .btn-upload input[type=file] { display: none; }
    .btn-upload:hover { background: #eee; }
    .btn-upload.disabled { opacity: .6; cursor: default; }
    .btn-spinner-dark { display: inline-block; width: 10px; height: 10px; border: 2px solid rgba(0,0,0,.2); border-top-color: #333; border-radius: 50%; animation: spin .55s linear infinite; margin-right: .4rem; }
    .btn-del-img { padding: .4rem .9rem; background: #fff; border: 1px solid #f0c0c0; color: #c00; font-size: .75rem; cursor: pointer; border-radius: 2px; }

    .tag-input-wrap { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; border: 1px solid #ddd; padding: .45rem .6rem; border-radius: 2px; min-height: 42px; }
    .tag-input-wrap:focus-within { border-color: #07102e; }
    .tag-input { border: none; outline: none; font-size: .88rem; padding: .1rem .2rem; min-width: 80px; }

    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
    .error { color: #c00; font-size: .82rem; margin: .5rem 0; }
    .info { color: #666; font-size: .9rem; }
  `]
})
export class TeachersComponent implements OnInit {
  teachers = signal<Teacher[]>([]);
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal('');
  tags = signal<string[]>([]);
  tagInput = '';
  previewUrl = signal<string | null>(null);

  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      name:       ['', Validators.required],
      role:       ['', Validators.required],
      bio:        [''],
      image_url:  [null],
      sort_order: [0],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('teachers').select('*').order('sort_order').order('name');
    this.teachers.set(data ?? []);
    this.loading.set(false);
  }

  initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ sort_order: 0 });
    this.tags.set([]);
    this.tagInput = '';
    this.previewUrl.set(null);
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(t: Teacher) {
    this.editingId.set(t.id);
    this.form.patchValue(t);
    this.tags.set([...(t.tags ?? [])]);
    this.tagInput = '';
    this.previewUrl.set(t.image_url);
    this.error.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  addTag(e: Event) {
    e.preventDefault();
    const val = this.tagInput.trim().replace(/,$/, '');
    if (val && !this.tags().includes(val)) this.tags.update(t => [...t, val]);
    this.tagInput = '';
  }

  removeTag(tag: string) { this.tags.update(t => t.filter(x => x !== tag)); }

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
    const { error } = await this.sb.client.storage.from('teacher-images').upload(path, file);
    if (error) {
      this.error.set('Feltöltési hiba: ' + error.message);
      this.uploading.set(false);
      return;
    }
    const { data } = this.sb.client.storage.from('teacher-images').getPublicUrl(path);
    this.previewUrl.set(data.publicUrl);
    this.form.patchValue({ image_url: data.publicUrl });
    this.uploading.set(false);
    this.toast.success('Fotó feltöltve');
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const val = { ...this.form.value, tags: this.tags() };
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('teachers').update(val).eq('id', id)
      : await this.sb.client.from('teachers').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeForm(); await this.load(); this.toast.success('Tanár elmentve'); }
    this.saving.set(false);
  }

  async deleteTeacher(id: string) {
    if (!confirm('Biztosan törlöd ezt a tanárt?')) return;
    await this.sb.client.from('teachers').delete().eq('id', id);
    await this.load();
    this.toast.info('Tanár törölve');
  }
}
