import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';

/** FAQ's: searchable accordion grouped by category. */
@Component({
  selector: 'app-faq', standalone: true, imports: [FormsModule],
  styles: [`
    .faq-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 28px; }
    .faq-list { border-top: 1px solid var(--border); }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 0; background: none; border: 0; cursor: pointer; text-align: left; color: var(--text); }
    .faq-q > span:first-child { display: grid; gap: 6px; }
    .faq-q small { font: 600 0.68rem var(--font-sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
    .faq-q b { font: 400 clamp(1.15rem, 2vw, 1.4rem)/1.3 var(--font-serif); letter-spacing: -0.01em; }
    .faq-ic { flex: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border); display: grid; place-items: center;
      transition: transform 0.5s var(--ease), background-color 0.3s, color 0.3s; }
    .faq-q:hover .faq-ic { background: var(--text); color: var(--bg); }
    .faq-item.open .faq-ic { transform: rotate(45deg); background: var(--primary); color: var(--on-primary); border-color: transparent; }
    .faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s var(--ease); }
    .faq-item.open .faq-a { grid-template-rows: 1fr; }
    .faq-a > div { overflow: hidden; }
    .faq-a p { margin: 0; padding: 0 64px 26px 0; color: var(--text-2); }
  `],
  template: `<div class="page container narrow">
    <div class="title"><h1>Questions, <em>answered</em></h1><p class="muted">Memberships, recipes, books and our recipe contest — all in one place.</p></div>
    <div class="field"><input id="q" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder=" " aria-label="Search FAQs"><label for="q">Search questions…</label></div>
    <div class="faq-filters">
      <button class="btn sm" [class.ghost]="cat() !== ''" (click)="cat.set('')">All</button>
      @for (c of cats(); track c) { <button class="btn sm" [class.ghost]="cat() !== c" (click)="cat.set(c)">{{ c }}</button> }
    </div>
    <div class="faq-list">
      @for (f of shown(); track f.faqId) {
        <div class="faq-item" [class.open]="open() === f.faqId">
          <button class="faq-q" (click)="open.set(open() === f.faqId ? 0 : f.faqId)" [attr.aria-expanded]="open() === f.faqId">
            <span><small>{{ f.category }}</small><b>{{ f.question }}</b></span>
            <span class="faq-ic" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
          </button>
          <div class="faq-a"><div><p>{{ f.answer }}</p></div></div>
        </div>
      }
    </div>
    @if (!shown().length) { <div class="empty">No questions found.</div> }
  </div>`
})
export class FaqComponent implements OnInit {
  private api = inject(Api); items = signal<any[]>([]); q = signal(''); cat = signal(''); open = signal(0);
  cats = computed(() => [...new Set(this.items().map(i => i.category))]);
  shown = computed(() => this.items().filter(i => (!this.cat() || i.category === this.cat()) && (i.question + i.answer).toLowerCase().includes(this.q().toLowerCase())));
  ngOnInit() { this.api.get('public/faqs').subscribe(r => this.items.set(r)); }
}
