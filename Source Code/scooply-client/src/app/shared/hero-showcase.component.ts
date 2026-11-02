import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One flavor in the home hero: a real product photo and the panel tint that goes with it. */
export interface HeroSlide {
  name: string;
  img: string;
  tint: string;       // CSS colour (theme token) for the photo panel
  blurb: string;
}

/**
 * Home hero — split layout.
 *  Left: headline, intro, actions and flavor tabs.
 *  Right: a flavor-tinted panel with the photo in an arch frame; new flavors wipe up from the bottom.
 * Motion: line-by-line headline reveal, pointer parallax on the photo, scroll drift, a slowly turning
 * "small batch" stamp. Autoplay is driven by the active tab's progress bar, pauses on hover/focus and
 * off-screen, and is off for prefers-reduced-motion.
 */
@Component({
  selector: 'app-hero-showcase', standalone: true, imports: [RouterLink],
  template: `
  <section class="hero" [class.paused]="hold() || !inView()" [style.--tint]="slide().tint"
           (pointerdown)="swipeStart($event)" (pointerup)="swipeEnd($event)" aria-roledescription="carousel" aria-label="Featured flavors">
    <div class="hero-copy">
      <span class="eyebrow">Scooply Parlour · Since 1998</span>
      <h1 class="hero-title lines">
        <span class="ln"><span>Taste joy</span></span>
        <span class="ln"><span>in every <em>scoop.</em></span></span>
      </h1>
      <p class="hero-lead">Small-batch ice cream churned with real cream and honest ingredients — and the recipes to make every one of them at home.</p>
      <div class="hero-cta">
        <a routerLink="/recipes" class="btn lg">Explore recipes <i class="fa-solid fa-arrow-right"></i></a>
        <a routerLink="/books" class="link-arrow">Order our books <i class="fa-solid fa-arrow-right"></i></a>
      </div>

      <div class="hero-tabs" role="tablist" aria-label="Choose a flavor" (keydown)="onKey($event)"
           (mouseenter)="hold.set(true)" (mouseleave)="hold.set(false)" (focusin)="hold.set(true)" (focusout)="hold.set(false)">
        @for (s of slides; track s.name; let i = $index) {
          <button type="button" role="tab" class="hero-tab" [class.on]="i === cur()" [attr.aria-selected]="i === cur()"
                  [attr.tabindex]="i === cur() ? 0 : -1" (click)="go(i)">
            <span class="hero-tab-n">{{ pad(i + 1) }}</span>{{ s.name }}
            <span class="hero-tab-bar">@if (i === cur()) { <span [style.animation-duration.ms]="DUR" (animationend)="next()"></span> }</span>
          </button>
        }
      </div>
    </div>

    <div class="hero-panel" (mouseenter)="hold.set(true)" (mouseleave)="hold.set(false)">
      <div class="hero-arch">
        @for (s of slides; track s.name; let i = $index) {
          <div class="hero-shot" [class.on]="i === cur()" [class.was]="i === prev()">
            @if (seen().has(i)) {
              <img [src]="s.img" [alt]="s.name + ' ice cream'" decoding="async" [attr.fetchpriority]="i === 0 ? 'high' : null">
            }
          </div>
        }
      </div>

      <div class="hero-stamp" aria-hidden="true">
        <svg viewBox="0 0 120 120"><defs><path id="stampPath" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>
          <text><textPath href="#stampPath" textLength="285" lengthAdjust="spacing">SMALL BATCH · HANDMADE · SINCE 1998 ·</textPath></text></svg>
        <i class="fa-solid fa-ice-cream"></i>
      </div>

      @for (n of [cur()]; track n) {
        <div class="hero-caption" aria-live="polite">
          <span class="hero-cap-n">{{ pad(n + 1) }} / {{ pad(slides.length) }}</span>
          <h2 class="hero-cap-name">{{ slides[n].name }}</h2>
          <p>{{ slides[n].blurb }}</p>
        </div>
      }
    </div>
  </section>`,
  styles: [`
    :host { display: block; }
    .hero { --mx: 0; --my: 0; --sp: 0; position: relative; display: grid; padding: 0; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      min-height: max(680px, 100svh); touch-action: pan-y; }

    /* ---------- copy ---------- */
    .hero-copy { display: flex; flex-direction: column; justify-content: center;
      padding: calc(var(--nav-h) + 40px) clamp(24px, 5vw, 80px) 56px max(24px, calc((100vw - 1400px) / 2 + 24px));
      transform: translate3d(0, calc(var(--sp) * -40px), 0); opacity: calc(1 - var(--sp) * 0.9); }
    .eyebrow { animation: riseIn 1s var(--ease) both; }
    .hero-title { font-size: clamp(3rem, 7vw, 6.4rem); line-height: 0.98; letter-spacing: -0.035em; font-weight: 350; margin: 0 0 28px; }
    .hero-title em { font-weight: 300; }
    .hero-lead { max-width: 440px; font-size: 1.08rem; line-height: 1.7; color: var(--text-2); margin: 0 0 34px; animation: riseIn 1s 0.25s var(--ease) both; }
    .hero-cta { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; animation: riseIn 1s 0.35s var(--ease) both; }

    .hero-tabs { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-top: clamp(40px, 6vh, 72px); max-width: 560px; padding-top: 22px; border-top: 1px solid var(--border-light);
      animation: riseIn 1s 0.45s var(--ease) both; }
    .hero-tab { position: relative; padding: 8px 0 12px; border: 0; background: none; cursor: pointer; color: var(--muted); font: 500 0.92rem var(--font-sans);
      transition: color 0.3s; display: inline-flex; align-items: baseline; gap: 6px; }
    .hero-tab:hover, .hero-tab.on { color: var(--text); }
    .hero-tab-n { font: italic 400 0.78rem var(--font-serif); color: var(--accent); }
    .hero-tab-bar { position: absolute; left: 0; right: 0; bottom: 4px; height: 1px; overflow: hidden; }
    .hero-tab.on .hero-tab-bar { background: var(--border); }
    .hero-tab-bar span { position: absolute; inset: 0; background: var(--text); transform-origin: left; animation: heroBar linear forwards; }
    .hero.paused .hero-tab-bar span { animation-play-state: paused; }
    @keyframes heroBar { from { transform: scaleX(0); } }

    /* ---------- photo panel ---------- */
    .hero-panel { position: relative; display: grid; place-items: center; background: var(--tint); overflow: hidden;
      border-bottom-left-radius: clamp(32px, 6vw, 96px); transition: background-color 1.2s var(--ease);
      padding: calc(var(--nav-h) + 30px) clamp(24px, 4vw, 60px) 170px; }
    .hero-panel::after { /* paper grain */
      content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.35; mix-blend-mode: multiply;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
    :host-context([data-theme=dark]) .hero-panel::after { mix-blend-mode: screen; opacity: 0.25; }
    .hero-arch { position: relative; z-index: 1; width: min(440px, 78%); aspect-ratio: 4 / 5; border-radius: 999px 999px 28px 28px; overflow: hidden;
      background: var(--bg-surface); box-shadow: var(--shadow-lg);
      transform: translate3d(calc(var(--mx) * -6px), calc(var(--my) * -6px + var(--sp) * 60px), 0);
      animation: archIn 1.4s 0.1s var(--ease) both; }
    @keyframes archIn { from { clip-path: inset(100% 0 0 0 round 999px 999px 28px 28px); translate: 0 40px; } to { clip-path: inset(0 0 0 0 round 999px 999px 28px 28px); } }
    .hero-shot { position: absolute; inset: 0; clip-path: inset(100% 0 0 0); z-index: 0; }
    .hero-shot.was { clip-path: inset(0); z-index: 1; }
    .hero-shot.on { clip-path: inset(0); z-index: 2; transition: clip-path 1.1s var(--ease-io); }
    .hero-shot img { position: absolute; inset: -5%; width: 110%; height: 110%; max-width: none; object-fit: cover; object-position: 50% 60%;
      transform: translate3d(calc(var(--mx) * 12px), calc(var(--my) * 10px), 0) scale(1.12); transition: transform 1.6s var(--ease); }
    .hero-shot.on img { transform: translate3d(calc(var(--mx) * 12px), calc(var(--my) * 10px), 0) scale(1); }

    .hero-stamp { position: absolute; z-index: 2; width: clamp(96px, 9vw, 128px); aspect-ratio: 1; top: calc(var(--nav-h) + 8%); left: 9%;
      display: grid; place-items: center; border-radius: 50%; background: var(--bg); color: var(--text); box-shadow: var(--shadow);
      animation: riseIn 1s 0.7s var(--ease) both; }
    .hero-stamp svg { position: absolute; inset: 0; width: 100%; height: 100%; animation: spin 26s linear infinite; }
    .hero-stamp text { font: 600 9.4px var(--font-sans); letter-spacing: 1px; fill: currentColor; }
    .hero-stamp i { font-size: 1.3rem; color: var(--accent); }

    .hero-caption { position: absolute; z-index: 2; left: clamp(24px, 4vw, 60px); right: clamp(24px, 4vw, 60px); bottom: 34px;
      display: grid; grid-template-columns: auto 1fr; column-gap: 20px; align-items: end; }
    .hero-cap-n { grid-row: span 2; font: italic 400 0.9rem var(--font-serif); color: var(--text-2); padding-bottom: 4px; animation: riseIn 0.8s var(--ease) both; }
    .hero-cap-name { margin: 0; font-size: clamp(1.6rem, 2.6vw, 2.2rem); line-height: 1.1; animation: riseIn 0.9s 0.1s var(--ease) both; }
    .hero-caption p { margin: 4px 0 0; max-width: 46ch; font-size: 0.9rem; color: var(--text-2); animation: riseIn 0.9s 0.2s var(--ease) both; }

    /* ---------- responsive ---------- */
    @media (max-width: 960px) {
      .hero { grid-template-columns: 1fr; min-height: 0; }
      .hero-panel { order: -1; border-radius: 0 0 40px 40px; padding: calc(var(--nav-h) + 16px) 24px 130px; }
      .hero-arch { width: min(340px, 74vw); }
      .hero-stamp { top: calc(var(--nav-h) + 20px); left: 16px; width: 92px; }
      .hero-caption { bottom: 24px; left: 24px; right: 24px; }
      .hero-copy { padding: 44px 24px 24px; transform: none; opacity: 1; }
      .hero-title { font-size: clamp(2.8rem, 12vw, 4rem); }
      .hero-tabs { gap: 0 18px; margin-top: 36px; }
    }
    @media (prefers-reduced-motion: reduce) { .hero-tab-bar span { animation: none; transform: scaleX(1); } }
  `]
})
export class HeroShowcaseComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) slides!: HeroSlide[];

  readonly DUR = 6000;
  cur = signal(0);
  prev = signal(-1);
  hold = signal(false);
  inView = signal(true);
  seen = signal(new Set<number>([0, 1]));
  slide = computed(() => this.slides[this.cur()]);

  private zone = inject(NgZone);
  private host = inject(ElementRef).nativeElement as HTMLElement;
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private io?: IntersectionObserver;
  private raf = 0;
  private mx = 0; private my = 0; private tx = 0; private ty = 0; private sp = -1;
  private swipeX = 0; private swipeY = 0;

  ngAfterViewInit() {
    this.io = new IntersectionObserver(([e]) => this.zone.run(() => this.inView.set(e.isIntersecting)), { threshold: 0.2 });
    this.io.observe(this.host);
    if (this.reduce) return;
    this.zone.runOutsideAngular(() => {
      addEventListener('pointermove', this.onPointer, { passive: true });
      addEventListener('scroll', this.kick, { passive: true });
      this.kick();
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf); this.io?.disconnect();
    removeEventListener('pointermove', this.onPointer);
    removeEventListener('scroll', this.kick);
  }

  go(i: number) {
    const n = this.slides.length, to = ((i % n) + n) % n;
    if (to === this.cur()) return;
    this.prev.set(this.cur()); this.cur.set(to);
    this.seen.update(s => new Set(s).add(to).add((to + 1) % n));     // warm the next photo too
  }
  next() { if (!this.reduce) this.go(this.cur() + 1); }
  pad(n: number) { return n < 10 ? '0' + n : '' + n; }

  onKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); this.go(this.cur() + (e.key === 'ArrowRight' ? 1 : -1));
    queueMicrotask(() => (this.host.querySelector('.hero-tab.on') as HTMLElement | null)?.focus());
  }
  swipeStart(e: PointerEvent) { this.swipeX = e.clientX; this.swipeY = e.clientY; }
  swipeEnd(e: PointerEvent) {
    const dx = e.clientX - this.swipeX, dy = e.clientY - this.swipeY;
    if (e.pointerType !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) this.go(this.cur() + (dx < 0 ? 1 : -1));
  }

  // pointer + scroll parallax, written as CSS variables outside Angular
  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.tx = (e.clientX / innerWidth) * 2 - 1; this.ty = (e.clientY / innerHeight) * 2 - 1; this.kick();
  };
  private kick = () => { if (!this.raf) this.raf = requestAnimationFrame(this.tick); };
  private tick = () => {
    this.raf = 0;
    const el = this.host.firstElementChild as HTMLElement | null; if (!el) return;
    const sp = Math.min(1, Math.max(0, scrollY / (el.offsetHeight || innerHeight)));
    if (sp >= 1 && this.sp >= 1) return;
    this.mx += (this.tx - this.mx) * 0.08; this.my += (this.ty - this.my) * 0.08;
    el.style.setProperty('--mx', this.mx.toFixed(4)); el.style.setProperty('--my', this.my.toFixed(4));
    if (sp !== this.sp) { el.style.setProperty('--sp', sp.toFixed(4)); this.sp = sp; }
    if (Math.abs(this.tx - this.mx) > 0.001 || Math.abs(this.ty - this.my) > 0.001) this.kick();
  };
}
