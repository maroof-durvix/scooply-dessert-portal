import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

/** Recipe details: unlocked for free recipes/active members, otherwise blurred with a lock overlay. */
@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page container printable">
      @if (loading()) {
        <div class="rd-hero"><div class="skeleton" style="aspect-ratio:4/5"></div><div class="skeleton" style="height:320px"></div></div>
      }
      @else if (rec()) {
        @let r = rec();
        <div class="rd-hero">
          <div class="rd-media" data-aos="reveal">
            <div class="rd-arch"><img [src]="api.img(r.imagePath)" [alt]="r.name + ' ice cream'"></div>
          </div>
          <div class="rd-info">
            <p class="crumbs"><a routerLink="/recipes">Recipes</a><i class="fa-solid fa-chevron-right"></i><span>{{ r.name }}</span></p>
            <div class="row rd-badges">
              @if (r.isFree) { <span class="badge free">Free recipe</span> }
              @else { <span class="badge member">Members</span> }
              @if (r.isMostFamous) { <span class="badge famous"><i class="fa-solid fa-star"></i> Most famous</span> }
            </div>
            <h1 class="rd-title lines"><span class="ln"><span>{{ r.name }}</span></span></h1>
            <p class="rd-desc">{{ r.shortDescription }}</p>
            <dl class="rd-meta">
              <div><dt>Prep</dt><dd>{{ r.prepTimeMinutes }} min</dd></div>
              <div><dt>Serves</dt><dd>{{ r.servings }}</dd></div>
              <div><dt>Steps</dt><dd>{{ r.steps?.length || '—' }}</dd></div>
            </dl>
            <div class="row" style="gap:10px">
              <button class="btn sm ghost" (click)="print()"><i class="fa-solid fa-print"></i> Print</button>
              <button class="btn sm ghost" (click)="share()"><i class="fa-solid fa-share-nodes"></i> Share</button>
            </div>
          </div>
        </div>

        @if (auth.isMember() && !auth.session()?.membershipActive && r.locked) {
          <div class="rd-warn">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Your membership has expired. Renew to see the full ingredients and method.</span>
            <a routerLink="/member/dashboard" fragment="membership" class="btn sm">Renew membership</a>
          </div>
        }

        <div class="lock-wrap">
          <div class="rd-body" [class.blurred]="r.locked">
            <section class="rd-col">
              <div class="rd-col-head">
                <h2>Ingredients</h2>
                @if (r.ingredients) {
                  <span>
                    @if (ticked().size > 0) {
                      {{ ticked().size }} of {{ r.ingredients.length }} checked · tap to tick
                    } @else {
                      {{ r.ingredients.length }} items · tap to tick
                    }
                  </span>
                }
              </div>
              <ul class="ing-list">
                @if (r.ingredients) {
                  @for (i of r.ingredients; track $index) {
                    <li>
                      <label [class.is-checked]="ticked().has($index)">
                        <input type="checkbox"
                               class="sr-only"
                               [checked]="ticked().has($index)"
                               (change)="toggleTick($index)">
                        <span class="tick-box">
                          <svg class="tick-svg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.5 7.5L5.5 10.5L11.5 3.5"/>
                          </svg>
                        </span>
                        <span class="ing-name">{{ i }}</span>
                      </label>
                    </li>
                  }
                } @else {
                  @for (n of fake; track n) { <li class="ghost-row"><span class="tick-box"></span><span>Hidden ingredient for members</span></li> }
                }
              </ul>
            </section>
            <section class="rd-col">
              <div class="rd-col-head"><h2>Method</h2>@if (r.steps) { <span>{{ r.steps.length }} steps</span> }</div>
              <ol class="step-list">
                @if (r.steps) {
                  @for (s of r.steps; track $index) { <li><span class="n">{{ pad($index + 1) }}</span><p>{{ s }}</p></li> }
                } @else {
                  @for (n of fake; track n) { <li class="ghost-row"><span class="n">{{ pad(n) }}</span><p>This step is part of the members-only method for this flavor.</p></li> }
                }
              </ol>
            </section>
          </div>

          @if (r.locked) {
            <div class="lock-ov">
              <i class="fa-solid fa-lock"></i>
              <h3>This recipe is for members</h3>
              @if (!auth.isMember()) {
                <p class="muted" style="margin:0 0 6px">Join Scooply to unlock all twenty parlour recipes.</p>
                <div class="row" style="justify-content:center">
                  <a class="btn" routerLink="/account/register">Join to unlock</a>
                  <a class="btn ghost" routerLink="/account/login" [queryParams]="{ returnUrl: '/recipes/' + r.flavorId }">Log in</a>
                </div>
              } @else {
                <a class="btn" routerLink="/member/dashboard" fragment="membership">Renew membership</a>
              }
            </div>
          }
        </div>
      }
      @else {
        <div class="empty">Recipe not found. <a routerLink="/recipes">Back to recipes</a></div>
      }
    </div>
  `,
  styles: [`
    .rd-hero { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: clamp(32px, 6vw, 96px); align-items: center; margin-bottom: clamp(56px, 7vw, 96px); }
    .rd-arch { aspect-ratio: 4 / 5; border-radius: 999px 999px 24px 24px; overflow: hidden; background: var(--bg-surface); max-width: 480px; }
    .rd-arch img { width: 100%; height: 100%; object-fit: cover; }
    .crumbs { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--muted); margin: 0 0 22px; }
    .crumbs i { font-size: 0.6rem; opacity: 0.6; }
    .crumbs a { color: var(--muted); text-decoration: none; }
    .crumbs a:hover { color: var(--text); }
    .rd-badges { margin-bottom: 18px; }
    .rd-title { font-size: clamp(2.8rem, 6vw, 5rem); line-height: 1; margin-bottom: 18px; font-weight: 350; }
    .rd-desc { font-size: 1.1rem; color: var(--text-2); max-width: 46ch; }
    .rd-meta { display: flex; margin: 28px 0 30px; border-block: 1px solid var(--border); }
    .rd-meta div { flex: 1; padding: 16px 0; }
    .rd-meta div + div { padding-left: 20px; border-left: 1px solid var(--border); }
    .rd-meta dt { font: 600 0.68rem var(--font-sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .rd-meta dd { margin: 4px 0 0; font: 400 1.6rem var(--font-serif); }
    .rd-warn { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 20px; border-radius: 16px; background: var(--t-butter); margin-bottom: 32px; }
    .rd-warn span { flex: 1; min-width: 200px; }

    .rd-body { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: clamp(32px, 5vw, 80px); }
    .rd-col-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--text); }
    .rd-col-head h2 { font-size: clamp(1.8rem, 3vw, 2.4rem); margin: 0; }
    .rd-col-head span { font-size: 0.82rem; color: var(--muted); }
    .ing-list, .step-list { list-style: none; padding: 0; margin: 0; }
    .ing-list li { border-bottom: 1px solid var(--border-light); }
    .ing-list label, .ghost-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; cursor: pointer; user-select: none; transition: color 0.3s; }
    .ing-name { flex: 1; }
    .tick-box { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border-glow); display: grid; place-items: center; color: transparent; transition: all 0.25s var(--ease); }
    .tick-svg { width: 11px; height: 11px; display: block; }
    .ing-list label:hover .tick-box { border-color: var(--text); }
    .ing-list label.is-checked,
    .ing-list label:has(input:checked) { color: var(--muted); text-decoration: line-through; text-decoration-color: var(--border-glow); }
    .ing-list label.is-checked .tick-box,
    .ing-list label:has(input:checked) .tick-box,
    .ing-list input:checked + .tick-box { background: var(--primary); border-color: var(--primary); color: var(--on-primary); transform: scale(1.05); }
    .step-list li { display: grid; grid-template-columns: 52px 1fr; gap: 8px; padding: 20px 0; border-bottom: 1px solid var(--border-light); }
    .step-list .n { font: italic 400 1.3rem var(--font-serif); color: var(--accent); }
    .step-list p { margin: 0; color: var(--text-2); font-size: 1rem; }
    .ghost-row { color: var(--muted); }
    @media (max-width: 860px) {
      .rd-hero, .rd-body { grid-template-columns: 1fr; }
      .rd-arch { max-width: 360px; }
    }
    @media print { .rd-arch { max-width: 240px; } .lock-ov, .row .btn { display: none !important; } }
  `]
})
export class RecipeDetailComponent implements OnInit {
  api = inject(Api);
  auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  rec = signal<any>(null);
  loading = signal(true);
  fake = [1, 2, 3, 4, 5, 6];
  ticked = signal<Set<number>>(new Set());
  pad(n: number) { return n < 10 ? '0' + n : '' + n; }

  toggleTick(idx: number) {
    const next = new Set(this.ticked());
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    this.ticked.set(next);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(p => {
      this.ticked.set(new Set());
      this.loading.set(true);
      this.api.get('recipes/' + p.get('id')).subscribe({
        next: r => { this.rec.set(r); this.loading.set(false); },
        error: () => { this.rec.set(null); this.loading.set(false); }
      });
    });
  }

  print() { window.print(); }
  share() {
    const url = location.href;
    if (navigator.share) navigator.share({ title: this.rec().name, url });
    else navigator.clipboard.writeText(url).then(() => this.toast.success('Link copied!'));
  }
}

