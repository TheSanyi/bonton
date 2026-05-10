import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Galéria</h1>
        <label class="btn-primary">
          {{ uploading() ? 'Feltöltés...' : '+ Képek feltöltése' }}
          <input type="file" accept="image/*" multiple (change)="onFilesChange($event)" [disabled]="uploading()">
        </label>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else if (!items().length) {
        <p class="info">Még nincs feltöltött kép.</p>
      } @else {
        <div class="gal-grid">
          @for (item of items(); track item.id) {
            <div class="gal-item">
              <img [src]="item.image_url" [alt]="item.caption" class="gal-img">
              <div class="gal-overlay">
                <input
                  class="caption-input"
                  type="text"
                  [(ngModel)]="item.caption"
                  placeholder="Képaláírás..."
                  (blur)="updateCaption(item)">
                <div class="gal-controls">
                  <button class="btn-order" (click)="moveUp(item)" title="Feljebb">↑</button>
                  <button class="btn-order" (click)="moveDown(item)" title="Lejjebb">↓</button>
                  <button class="btn-del" (click)="deleteItem(item)">Törlés</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .btn-primary {
      background: #07102e; color: #fff; border: none; padding: .6rem 1.4rem;
      font-size: .82rem; font-weight: 700; cursor: pointer; display: inline-block;
    }
    .btn-primary input[type=file] { display: none; }
    .btn-primary:hover { background: #0c1a42; }

    .gal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }
    .gal-item { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 4px; background: #eee; }
    .gal-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .gal-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.55);
      display: flex; flex-direction: column; justify-content: flex-end; padding: .6rem;
      opacity: 0; transition: opacity .2s;
    }
    .gal-item:hover .gal-overlay { opacity: 1; }
    .caption-input {
      width: 100%; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
      color: #fff; font-size: .78rem; padding: .3rem .5rem; border-radius: 2px;
      margin-bottom: .5rem; outline: none;
    }
    .caption-input::placeholder { color: rgba(255,255,255,.5); }
    .caption-input:focus { background: rgba(255,255,255,.25); }
    .gal-controls { display: flex; gap: .35rem; }
    .btn-order {
      background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.3);
      color: #fff; font-size: .8rem; padding: .2rem .5rem; cursor: pointer; border-radius: 2px;
    }
    .btn-order:hover { background: rgba(255,255,255,.35); }
    .btn-del {
      background: rgba(200,0,0,.5); border: 1px solid rgba(255,100,100,.4);
      color: #fff; font-size: .72rem; padding: .2rem .55rem; cursor: pointer; border-radius: 2px; margin-left: auto;
    }
    .btn-del:hover { background: rgba(200,0,0,.8); }

    .error { color: #c00; font-size: .85rem; margin-bottom: 1rem; }
    .info { color: #666; font-size: .9rem; }
  `]
})
export class GalleryComponent implements OnInit {
  items = signal<GalleryItem[]>([]);
  loading = signal(false);
  uploading = signal(false);
  error = signal('');

  constructor(private sb: SupabaseService, private fb: FormBuilder) {}

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const { data } = await this.sb.client.from('gallery').select('*').order('sort_order');
    this.items.set(data ?? []);
    this.loading.set(false);
  }

  async onFilesChange(e: globalThis.Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploading.set(true);
    this.error.set('');
    const maxOrder = Math.max(0, ...this.items().map(i => i.sort_order));
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${Date.now()}_${i}.${file.name.split('.').pop()}`;
      const { error: upErr } = await this.sb.client.storage.from('gallery').upload(path, file);
      if (upErr) { this.error.set('Feltöltési hiba: ' + upErr.message); continue; }
      const { data } = this.sb.client.storage.from('gallery').getPublicUrl(path);
      await this.sb.client.from('gallery').insert({ image_url: data.publicUrl, caption: '', sort_order: maxOrder + i + 1 });
    }
    this.uploading.set(false);
    await this.load();
    (e.target as HTMLInputElement).value = '';
  }

  async updateCaption(item: GalleryItem) {
    await this.sb.client.from('gallery').update({ caption: item.caption }).eq('id', item.id);
  }

  async moveUp(item: GalleryItem) {
    const list = this.items();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx === 0) return;
    await this.swapOrder(list[idx], list[idx - 1]);
    await this.load();
  }

  async moveDown(item: GalleryItem) {
    const list = this.items();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx === list.length - 1) return;
    await this.swapOrder(list[idx], list[idx + 1]);
    await this.load();
  }

  private async swapOrder(a: GalleryItem, b: GalleryItem) {
    await this.sb.client.from('gallery').update({ sort_order: b.sort_order }).eq('id', a.id);
    await this.sb.client.from('gallery').update({ sort_order: a.sort_order }).eq('id', b.id);
  }

  async deleteItem(item: GalleryItem) {
    if (!confirm('Biztosan törlöd ezt a képet?')) return;
    await this.sb.client.from('gallery').delete().eq('id', item.id);
    await this.load();
  }
}
