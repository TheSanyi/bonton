import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface Testimonial {
  id: string;
  quote: string;
  author_name: string;
  author_role: string;
  sort_order: number;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header"><h1>Rólunk</h1></div>

      @if (loading()) {
        <p class="info">Betöltés...</p>
      } @else {

        <!-- INTRO -->
        <div class="section-card">
          <h2 class="section-title">Bevezető szöveg</h2>
          <form [formGroup]="introForm" (ngSubmit)="saveIntro()">
            <div class="field">
              <label>Cím</label>
              <input type="text" formControlName="title" placeholder="pl. A Bonton története">
            </div>
            <div class="field">
              <label>Bevezető szöveg</label>
              <textarea formControlName="intro" rows="3"></textarea>
            </div>
            <div class="field">
              <label>Carousel — egyszerre látható idézetek</label>
              <div class="col-picker">
                @for (n of [1, 2, 3]; track n) {
                  <button type="button"
                    class="col-btn"
                    [class.active]="introForm.get('carousel_columns')!.value === n"
                    (click)="introForm.get('carousel_columns')!.setValue(n)">
                    {{ n }}
                  </button>
                }
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="savingIntro()">
                @if (savingIntro()) { <span class="btn-spinner"></span> }
                {{ savingIntro() ? 'Mentés...' : 'Mentés' }}
              </button>
            </div>
          </form>
        </div>

        <!-- IDÉZETEK -->
        <div class="section-card">
          <div class="section-head">
            <h2 class="section-title">Tanítványok mondják</h2>
            <button class="btn-add" (click)="openTestimonialForm()">+ Új idézet</button>
          </div>
          <div class="item-list">
            @for (t of testimonials(); track t.id) {
              <div class="item-row">
                <div class="item-body">
                  <div class="item-quote">&bdquo;{{ t.quote }}&rdquo;</div>
                  <div class="item-sub">{{ t.author_name }}{{ t.author_role ? ' — ' + t.author_role : '' }}</div>
                </div>
                <div class="item-actions">
                  <button class="btn-edit" (click)="openTestimonialForm(t)">Szerk.</button>
                  <button class="btn-del" (click)="deleteTestimonial(t.id)">Törlés</button>
                </div>
              </div>
            } @empty {
              <p class="info">Még nincs idézet felvéve.</p>
            }
          </div>
        </div>
      }
    </div>

    <!-- IDÉZET MODAL -->
    @if (showTestimonialForm()) {
      <div class="modal-bg" (click)="closeTestimonialForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingTestimonialId() ? 'Idézet szerkesztése' : 'Új idézet' }}</h2>
            <button class="close" (click)="closeTestimonialForm()">✕</button>
          </div>
          <form [formGroup]="testimonialForm" (ngSubmit)="saveTestimonial()">
            <div class="field">
              <label>Idézet <span class="req">*</span></label>
              <textarea formControlName="quote" rows="4" placeholder="Mit mondott a tanítvány..."></textarea>
            </div>
            <div class="field">
              <label>Név <span class="req">*</span></label>
              <input type="text" formControlName="author_name" placeholder="pl. Kovács Ági">
            </div>
            <div class="field">
              <label>Szerepkör / mióta tanul</label>
              <input type="text" formControlName="author_role" placeholder="pl. 2 éve tanul">
            </div>
            <div class="field">
              <label>Sorrend</label>
              <input type="number" formControlName="sort_order">
            </div>
            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="closeTestimonialForm()">Mégse</button>
              <button type="submit" class="btn-primary" [disabled]="savingTestimonial()">
                @if (savingTestimonial()) { <span class="btn-spinner"></span> }
                {{ savingTestimonial() ? 'Mentés...' : 'Mentés' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 760px; }
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #07102e; }

    .section-card {
      background: #fff; border: 1px solid #e5e5e5;
      border-radius: 4px; padding: 1.75rem; margin-bottom: 1.5rem;
    }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .section-title {
      font-size: .85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #07102e;
      margin: 0 0 1.25rem;
      padding-bottom: .75rem; border-bottom: 1px solid #f0f0f0;
      flex: 1;
    }
    .section-head .section-title { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }

    .btn-add {
      font-size: .75rem; font-weight: 700; padding: .45rem 1rem;
      background: #07102e; color: #fff; border: none; cursor: pointer; border-radius: 2px;
      white-space: nowrap; flex-shrink: 0;
    }

    .item-list { display: flex; flex-direction: column; gap: .6rem; }
    .item-row {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: .9rem 1rem; background: #fafafa; border: 1px solid #ececec; border-radius: 2px;
    }
    .item-body { flex: 1; min-width: 0; }
    .item-quote { font-size: .82rem; font-style: italic; color: #333; margin-bottom: .25rem; }
    .item-sub { font-size: .75rem; color: #888; }
    .item-actions { display: flex; gap: .35rem; flex-shrink: 0; }

    .btn-edit, .btn-del {
      font-size: .7rem; padding: .25rem .6rem; border: 1px solid #ddd;
      background: #fff; cursor: pointer; border-radius: 2px;
    }
    .btn-del { color: #c00; border-color: #f0c0c0; }
    .btn-del:hover { background: #fff0f0; }
    .btn-edit:hover { background: #f5f5f5; }

    .field { display: flex; flex-direction: column; margin-bottom: 1rem; }
    label { font-size: .72rem; font-weight: 700; color: #555; margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .06em; }
    .hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
    .req { color: #c00; }
    input, textarea {
      border: 1px solid #ddd; padding: .55rem .75rem; font-size: .9rem;
      outline: none; border-radius: 2px; transition: border-color .15s; font-family: inherit;
    }
    input:focus, textarea:focus { border-color: #07102e; }
    textarea { resize: vertical; }

    .col-picker { display: flex; gap: .5rem; }
    .col-btn {
      width: 2.4rem; height: 2.4rem; border: 1px solid #ddd; background: #fff;
      font-size: .9rem; font-weight: 600; cursor: pointer; border-radius: 2px;
      color: #555; transition: border-color .15s, color .15s, background .15s;
    }
    .col-btn:hover { border-color: #07102e; color: #07102e; }
    .col-btn.active { background: #07102e; color: #fff; border-color: #07102e; }

    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: .5rem; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: .5rem;
      background: #07102e; color: #fff; border: none; padding: .65rem 1.6rem;
      font-size: .82rem; font-weight: 700; cursor: pointer; letter-spacing: .05em; border-radius: 2px;
    }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .btn-ghost { background: #fff; color: #333; border: 1px solid #ddd; padding: .65rem 1.2rem; font-size: .82rem; cursor: pointer; border-radius: 2px; }

    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; width: 480px; max-height: 90vh; overflow-y: auto; padding: 2rem; border-radius: 4px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.05rem; font-weight: 700; color: #07102e; }
    .close { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666; }

    .btn-spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .55s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info { color: #888; font-size: .85rem; }
  `]
})
export class AboutComponent implements OnInit {
  loading = signal(false);
  savingIntro = signal(false);
  savingTestimonial = signal(false);

  aboutRowId = signal<number | null>(null);
  testimonials = signal<Testimonial[]>([]);

  showTestimonialForm = signal(false);
  editingTestimonialId = signal<string | null>(null);

  introForm: FormGroup;
  testimonialForm: FormGroup;

  constructor(private sb: SupabaseService, private fb: FormBuilder, private toast: ToastService) {
    this.introForm = this.fb.group({ title: [''], intro: [''], carousel_columns: [1] });
    this.testimonialForm = this.fb.group({
      quote: ['', Validators.required],
      author_name: ['', Validators.required],
      author_role: [''], sort_order: [0],
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    const [{ data: meta }, { data: tests }] = await Promise.all([
      this.sb.client.from('about').select('*').limit(1).single(),
      this.sb.client.from('about_testimonials').select('*').order('sort_order'),
    ]);
    if (meta) { this.aboutRowId.set(meta.id); this.introForm.patchValue({ title: meta.title ?? '', intro: meta.intro ?? '', carousel_columns: meta.carousel_columns ?? 1 }); }
    this.testimonials.set(tests ?? []);
    this.loading.set(false);
  }

  async saveIntro() {
    this.savingIntro.set(true);
    const val = this.introForm.value;
    const id = this.aboutRowId();
    const { error, data } = id
      ? await this.sb.client.from('about').update(val).eq('id', id).select().single()
      : await this.sb.client.from('about').insert(val).select().single();
    if (error) { this.toast.error(error.message); }
    else { if (!id && data) this.aboutRowId.set(data.id); this.toast.success('Bevezető elmentve'); }
    this.savingIntro.set(false);
  }

  openTestimonialForm(t?: Testimonial) {
    this.editingTestimonialId.set(t?.id ?? null);
    this.testimonialForm.reset({ sort_order: 0 });
    if (t) this.testimonialForm.patchValue(t);
    this.showTestimonialForm.set(true);
  }
  closeTestimonialForm() { this.showTestimonialForm.set(false); }

  async saveTestimonial() {
    if (this.testimonialForm.invalid) return;
    this.savingTestimonial.set(true);
    const val = this.testimonialForm.value;
    const id = this.editingTestimonialId();
    const { error } = id
      ? await this.sb.client.from('about_testimonials').update(val).eq('id', id)
      : await this.sb.client.from('about_testimonials').insert(val);
    if (error) { this.toast.error(error.message); }
    else { this.closeTestimonialForm(); await this.reloadTestimonials(); this.toast.success('Idézet elmentve'); }
    this.savingTestimonial.set(false);
  }

  async deleteTestimonial(id: string) {
    if (!confirm('Biztosan törlöd?')) return;
    await this.sb.client.from('about_testimonials').delete().eq('id', id);
    await this.reloadTestimonials();
    this.toast.info('Idézet törölve');
  }

  async reloadTestimonials() {
    const { data } = await this.sb.client.from('about_testimonials').select('*').order('sort_order');
    this.testimonials.set(data ?? []);
  }
}
