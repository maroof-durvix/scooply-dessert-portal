import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { ParallaxDirective } from '../../core/directives';

/** Free Recipe Available: each free recipe laid out as a cookbook spread, fully visible to everyone. */
@Component({
  selector: 'app-free', standalone: true, imports: [RouterLink, ParallaxDirective],
  template: `
    <div class="page container">
      <div class="title">
        <h1>Free recipes, <em>on the house</em></h1>
        <p class="muted">Complete parlour recipes you can make at home today — no membership required.</p>
      </div>

      @if (loading()) {
        <div class="spread"><div class="skeleton" style="aspect-ratio:4/5"></div><div class="skeleton" style="height:420px"></div></div>
      }

      @for (r of items(); track r.flavorId; let i = $index) {
        <article class="spread" [class.flip]="i % 2 === 1">
          <div class="spread-media" data-aos="reveal">
            <div class="spread-img"><img [src]="api.img(r.imagePath)" [alt]="r.name + ' ice cream'" loading="lazy" parallax="0.06"></div>
          </div>

          <div class="spread-body" data-aos="fade-up">
            <span class="eyebrow">Free recipe · No. {{ pad(i + 1) }}</span>
            <h2>{{ r.name }}</h2>
            <p class="spread-desc">{{ r.shortDescription }}</p>
            <dl class="spread-meta">
              <div><dt>Prep</dt><dd>{{ r.prepTimeMinutes }} min</dd></div>
              <div><dt>Serves</dt><dd>{{ r.servings }}</dd></div>
              <div><dt>Ingredients</dt><dd>{{ r.ingredients?.length || 0 }}</dd></div>
            </dl>

            <h3 class="spread-h">Ingredients</h3>
            <ul class="ing">@for (x of r.ingredients; track $index) { <li>{{ x }}</li> }</ul>

            <h3 class="spread-h">Method</h3>
            <ol class="method">@for (s of r.steps; track $index) { <li><span>{{ pad($index + 1) }}</span>{{ s }}</li> }</ol>

            <a [routerLink]="['/recipes', r.flavorId]" class="link-arrow">Open the full recipe page <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </article>
      }

      @if (!loading() && !items().length) { <div class="empty">No free recipes available right now. Check back soon!</div> }

      <div class="free-cta" data-aos="fade-up">
        <div><h3>Want all twenty?</h3><p class="muted">Members unlock every parlour recipe, step by step.</p></div>
        <a routerLink="/account/register" class="btn">See membership plans <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
  `,
  styles: [`
    .spread { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(32px, 6vw, 96px); align-items: start;
      padding: clamp(48px, 6vw, 80px) 0; border-top: 1px solid var(--border); }
    .spread.flip .spread-media { order: 2; }
    .spread-media { position: sticky; top: calc(var(--nav-h) + 24px); }
    .spread-img { aspect-ratio: 4 / 5; border-radius: 999px 999px 24px 24px; overflow: hidden; background: var(--bg-surface); }
    .spread-img img { width: 100%; height: 100%; object-fit: cover; }
    .spread-body h2 { font-size: clamp(2.2rem, 4.5vw, 3.4rem); margin-bottom: 12px; }
    .spread-desc { font-size: 1.08rem; color: var(--text-2); max-width: 48ch; }
    .spread-meta { display: flex; gap: 0; margin: 26px 0 36px; border-block: 1px solid var(--border); }
    .spread-meta div { flex: 1; padding: 16px 0; }
    .spread-meta div + div { padding-left: 20px; border-left: 1px solid var(--border); }
    .spread-meta dt { font: 600 0.68rem var(--font-sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .spread-meta dd { margin: 4px 0 0; font: 400 1.5rem var(--font-serif); }
    .spread-h { font-size: 1.35rem; margin: 0 0 14px; }
    .ing { list-style: none; padding: 0; margin: 0 0 36px; columns: 2; column-gap: 32px; }
    .ing li { break-inside: avoid; padding: 10px 0 10px 20px; border-bottom: 1px solid var(--border-light); position: relative; font-size: 0.95rem; }
    .ing li::before { content: ''; position: absolute; left: 2px; top: 19px; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
    .method { list-style: none; padding: 0; margin: 0 0 32px; counter-reset: m; }
    .method li { display: grid; grid-template-columns: 44px 1fr; gap: 8px; padding: 14px 0; border-bottom: 1px solid var(--border-light); font-size: 0.97rem; color: var(--text-2); }
    .method li span { font: italic 400 1.1rem var(--font-serif); color: var(--accent); }
    .free-cta { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; padding: 36px clamp(24px, 4vw, 48px); border-radius: var(--radius-lg); background: var(--t-butter); margin-top: 24px; }
    .free-cta h3 { margin: 0 0 4px; }
    .free-cta p { margin: 0; }
    @media (max-width: 860px) {
      .spread { grid-template-columns: 1fr; }
      .spread.flip .spread-media { order: 0; }
      .spread-media { position: static; max-width: 380px; }
      .ing { columns: 1; }
    }
  `]
})
export class FreeComponent implements OnInit {
  api = inject(Api);
  items = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.get('recipes/free').subscribe({
      next: r => { this.items.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  pad(n: number) { return n < 10 ? '0' + n : '' + n; }
}
