import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

interface CalendarEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  location: string;
  time_info: string;
  image_url: string | null;
}

const EVENT_TYPES = ['Workshop', 'Verseny', 'Nyílt nap', 'Évzáró Gála', 'Egyéb'];

const TYPE_CLASS: Record<string, string> = {
  'Workshop':     'et-w',
  'Verseny':      'et-v',
  'Nyílt nap':    'et-o',
  'Évzáró Gála':  'et-g',
  'Egyéb':        'et-g',
};

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Események</h1>
        <button class="btn-primary" (click)="openNew()">+ Új esemény</button>
      </div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {
        <div class="event-list">
          @for (ev of events(); track ev.id) {
            <div class="ev-row">
              <div class="ev-img-wrap">
                @if (ev.image_url) {
                  <img [src]="ev.image_url" [alt]="ev.title" class="ev-thumb">
                } @else {
                  <div class="ev-thumb-placeholder">—</div>
                }
              </div>
              <div class="ev-info">
                <div class="ev-meta">
                  <span class="ev-badge" [class]="typeClass(ev.type)">{{ ev.type }}</span>
                  <span class="ev-date">{{ ev.date | date:'yyyy. MM. dd.' }}</span>
                  @if (ev.time_info) { <span class="ev-time">{{ ev.time_info }}</span> }
                </div>
                <div class="ev-title">{{ ev.title }}</div>
                @if (ev.location) { <div class="ev-loc">{{ ev.location }}</div> }
              </div>
              <div class="ev-actions">
                <button class="btn-edit" (click)="openEdit(ev)">Szerkesztés</button>
                <button class="btn-del" (click)="deleteEvent(ev.id)">Törlés</button>
              </div>
            </div>
          } @empty {
            <p class="info">Még nincs esemény felvéve.</p>
          }
        </div>
      }

      @if (showForm()) {
        <div class="modal-bg" (click)="closeForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingId() ? 'Esemény szerkesztése' : 'Új esemény' }}</h2>
              <button class="close" (click)="closeForm()">✕</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="form-row">
                <div class="field">
                  <label>Típus</label>
                  <select formControlName="type">
                    @for (t of eventTypes; track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Dátum</label>
                  <input type="date" formControlName="date">
                </div>
              </div>
              <div class="field">
                <label>Cím</label>
                <input type="text" formControlName="title" placeholder="pl. Latin Intenzív Workshop">
              </div>
              <div class="field">
                <label>Leírás</label>
                <textarea formControlName="description" rows="4" placeholder="Az esemény részletes leírása..."></textarea>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Helyszín</label>
                  <input type="text" formControlName="location" placeholder="pl. Bonton Stúdió, Budapest VI.">
                </div>
                <div class="field">
                  <label>Időpont</label>
                  <input type="text" formControlName="time_info" placeholder="pl. 14:00 – 17:00">
                </div>
              </div>

              <div class="field">
                <label>Kép <span class="hint">(opcionális)</span></label>
                <div class="img-upload-wrap">
                  @if (previewUrl()) {
                    <img [src]="previewUrl()!" class="img-preview" alt="preview">
                  } @else {
                    <div class="img-placeholder">Nincs kép</div>
                  }
                  <div class="img-actions">
                    <label class="btn-upload">
                      {{ uploading() ? 'Feltöltés...' : 'Kép kiválasztása' }}
                      <input type="file" accept="image/*" (change)="onFileChange($event)" [disabled]="uploading()">
                    </label>
                    @if (previewUrl()) {
                      <button type="button" class="btn-del-img" (click)="removeImage()">Kép törlése</button>
                    }
                  </div>
                </div>
              </div>

              @if (error()) { <p class="error">{{ error() }}</p> }
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="closeForm()">Mégse</button>
                <button type="submit" class="btn-primary" [disabled]="saving() || uploading()">
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
    .page { max-width: 900px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .event-list { display: flex; flex-direction: column; gap: .5rem; }
    .ev-row {
      background: #fff; border: 1px solid #e5e5e5; border-radius: 4px;
      display: flex; align-items: center; gap: 1rem; padding: .85rem 1rem;
    }
    .ev-img-wrap { flex-shrink: 0; }
    .ev-thumb { width: 80px; height: 56px; object-fit: cover; border-radius: 3px; display: block; }
    .ev-thumb-placeholder {
      width: 80px; height: 56px; background: #f0f0f0; border-radius: 3px;
      display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 1.2rem;
    }
    .ev-info { flex: 1; min-width: 0; }
    .ev-meta { display: flex; align-items: center; gap: .6rem; margin-bottom: .3rem; flex-wrap: wrap; }
    .ev-badge {
      font-size: .65rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
      padding: .2rem .6rem; border-radius: 2px;
    }
    .et-w { background: rgba(255,45,139,.12); color: #c0006a; }
    .et-v { background: rgba(224,0,255,.12); color: #9b00c9; }
    .et-g, .et-o { background: #f0f0f0; color: #555; }
    .ev-date { font-size: .8rem; font-weight: 600; color: #07102e; }
    .ev-time { font-size: .78rem; color: #888; }
    .ev-title { font-weight: 600; font-size: .95rem; color: #07102e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ev-loc { font-size: .78rem; color: #888; margin-top: .15rem; }
    .ev-actions { display: flex; gap: .4rem; flex-shrink: 0; }

    .btn-edit, .btn-del {
      font-size: .7rem; padding: .25rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }

    .btn-primary { background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem; font-size: .82rem; font-weight: 700; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost { background: #fff; color: #333; border: 1px solid #ddd; padding: .6rem 1.4rem; font-size: .82rem; cursor: pointer; }

    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; width: 560px; max-height: 90vh; overflow-y: auto; padding: 2rem; border-radius: 4px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    .hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
    input, select, textarea { border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem; outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit; }
    input:focus, select:focus, textarea:focus { border-color: #07102e; }
    textarea { resize: vertical; }

    .img-upload-wrap { display: flex; gap: 1rem; align-items: flex-start; }
    .img-preview { width: 120px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
    .img-placeholder { width: 120px; height: 80px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: .75rem; color: #aaa; }
    .img-actions { display: flex; flex-direction: column; gap: .5rem; }
    .btn-upload { display: inline-block; padding: .5rem .9rem; background: #f5f5f5; border: 1px solid #ddd; font-size: .78rem; cursor: pointer; border-radius: 2px; font-weight: 600; }
    .btn-upload input[type=file] { display: none; }
    .btn-upload:hover { background: #eee; }
    .btn-del-img { padding: .4rem .9rem; background: #fff; border: 1px solid #f0c0c0; color: #c00; font-size: .75rem; cursor: pointer; border-radius: 2px; }

    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
    .error { color: #c00; font-size: .82rem; margin: .5rem 0; }
    .info { color: #666; font-size: .9rem; }
  `]
})
export class EventsComponent implements OnInit {
  events = signal<CalendarEvent[]>([]);
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal('');
  previewUrl = signal<string | null>(null);

  eventTypes = EVENT_TYPES;
  form: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder) {
    this.form = this.fb.group({
      type:        [EVENT_TYPES[0], Validators.required],
      date:        ['', Validators.required],
      title:       ['', Validators.required],
      description: [''],
      location:    [''],
      time_info:   [''],
      image_url:   [null],
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('events').select('*').order('date');
    this.events.set(data ?? []);
    this.loading.set(false);
  }

  typeClass(type: string) { return TYPE_CLASS[type] ?? 'et-g'; }

  openNew() {
    this.editingId.set(null);
    this.form.reset({ type: EVENT_TYPES[0] });
    this.previewUrl.set(null);
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(ev: CalendarEvent) {
    this.editingId.set(ev.id);
    this.form.patchValue(ev);
    this.previewUrl.set(ev.image_url);
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
    const path = `${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await this.sb.client.storage.from('event-images').upload(path, file);
    if (error) { this.error.set('Feltöltési hiba: ' + error.message); this.uploading.set(false); return; }
    const { data } = this.sb.client.storage.from('event-images').getPublicUrl(path);
    this.previewUrl.set(data.publicUrl);
    this.form.patchValue({ image_url: data.publicUrl });
    this.uploading.set(false);
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value;
    const id = this.editingId();
    const { error } = id
      ? await this.sb.client.from('events').update(val).eq('id', id)
      : await this.sb.client.from('events').insert(val);
    if (error) { this.error.set(error.message); }
    else { this.closeForm(); await this.load(); }
    this.saving.set(false);
  }

  async deleteEvent(id: string) {
    if (!confirm('Biztosan törlöd ezt az eseményt?')) return;
    await this.sb.client.from('events').delete().eq('id', id);
    await this.load();
  }
}
