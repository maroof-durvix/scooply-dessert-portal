import { Directive, ElementRef, HostListener, Input, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

/** 3D tilt on hover (flavor cards). Disabled for reduced motion. */
@Directive({ selector: '[tilt]', standalone: true })
export class TiltDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef).nativeElement as HTMLElement;
  private zone = inject(NgZone);
  private off = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private rect: DOMRect | null = null;
  private rafId = 0;
  private unlisteners: (() => void)[] = [];

  ngOnInit() {
    if (this.off) return;
    this.zone.runOutsideAngular(() => {
      const onEnter = () => { this.rect = this.el.getBoundingClientRect(); };
      const onMove = (e: MouseEvent) => {
        if (!this.rect) this.rect = this.el.getBoundingClientRect();
        const r = this.rect;
        const x = (e.clientX - r.left) / (r.width || 1) - .5;
        const y = (e.clientY - r.top) / (r.height || 1) - .5;
        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
          this.el.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
        });
      };
      const onLeave = () => {
        this.rect = null;
        cancelAnimationFrame(this.rafId);
        this.el.style.transform = '';
      };
      this.el.addEventListener('mouseenter', onEnter, { passive: true });
      this.el.addEventListener('mousemove', onMove, { passive: true });
      this.el.addEventListener('mouseleave', onLeave, { passive: true });
      this.unlisteners.push(
        () => this.el.removeEventListener('mouseenter', onEnter),
        () => this.el.removeEventListener('mousemove', onMove),
        () => this.el.removeEventListener('mouseleave', onLeave)
      );
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.rafId);
    this.unlisteners.forEach(u => u());
  }
}

/** Counts up to a number when scrolled into view. */
@Directive({ selector: '[counter]', standalone: true })
export class CounterDirective implements OnInit, OnDestroy {
  @Input('counter') target = 0;
  private el = inject(ElementRef).nativeElement as HTMLElement;
  private io?: IntersectionObserver;
  ngOnInit() {
    this.el.textContent = '0';
    this.io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; this.io?.disconnect();
      const t = +this.target, start = performance.now(), dur = 1400;
      const step = (now: number) => { const p = Math.min(1, (now - start) / dur); this.el.textContent = Math.floor(t * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .4 });
    this.io.observe(this.el);
  }
  ngOnDestroy() { this.io?.disconnect(); }
}

/** Magnetic pull on primary CTAs. */
@Directive({ selector: '[magnetic]', standalone: true })
export class MagneticDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef).nativeElement as HTMLElement;
  private zone = inject(NgZone);
  private rect: DOMRect | null = null;
  private rafId = 0;
  private unlisteners: (() => void)[] = [];

  ngOnInit() {
    this.zone.runOutsideAngular(() => {
      const onEnter = () => { this.rect = this.el.getBoundingClientRect(); };
      const onMove = (e: MouseEvent) => {
        if (!this.rect) this.rect = this.el.getBoundingClientRect();
        const r = this.rect;
        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
          this.el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px, ${(e.clientY - r.top - r.height / 2) * .25}px)`;
        });
      };
      const onLeave = () => {
        this.rect = null;
        cancelAnimationFrame(this.rafId);
        this.el.style.transform = '';
      };
      this.el.addEventListener('mouseenter', onEnter, { passive: true });
      this.el.addEventListener('mousemove', onMove, { passive: true });
      this.el.addEventListener('mouseleave', onLeave, { passive: true });
      this.unlisteners.push(
        () => this.el.removeEventListener('mouseenter', onEnter),
        () => this.el.removeEventListener('mousemove', onMove),
        () => this.el.removeEventListener('mouseleave', onLeave)
      );
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.rafId);
    this.unlisteners.forEach(u => u());
  }
}

/**
 * Scroll parallax for images inside a clipping frame: the image is slightly oversized and drifts
 * against the scroll direction, so photos read as sitting "behind" their card. Uses the independent
 * `translate`/`scale` properties so it composes with existing hover `transform`s.
 * One shared rAF loop drives every instance; only on-screen elements are updated.
 */
@Directive({ selector: '[parallax]', standalone: true })
export class ParallaxDirective implements OnInit, OnDestroy {
  @Input('parallax') strength: number | string = 0.12;
  private el = inject(ElementRef).nativeElement as HTMLElement;
  private zone = inject(NgZone);
  private io?: IntersectionObserver;

  private static items = new Set<ParallaxDirective>();
  private static raf = 0;
  private static bound = false;
  private static schedule = () => { if (!ParallaxDirective.raf) ParallaxDirective.raf = requestAnimationFrame(ParallaxDirective.update); };
  private static update = () => {
    ParallaxDirective.raf = 0;
    const vh = innerHeight;
    ParallaxDirective.items.forEach(p => {
      const r = p.el.getBoundingClientRect();
      const k = +p.strength || 0.12;
      // -1 … 1 as the element travels through the viewport (0 when centred); never exceeds the oversize margin
      const t = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2)));
      p.el.style.translate = `0 ${(-t * r.height * k / (1 + 2 * k)).toFixed(1)}px`;
    });
  };

  ngOnInit() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.zone.runOutsideAngular(() => {
      this.el.style.scale = String(1 + 2 * (+this.strength || 0.12));
      this.el.style.willChange = 'translate';
      this.io = new IntersectionObserver(([e]) => {
        e.isIntersecting ? ParallaxDirective.items.add(this) : ParallaxDirective.items.delete(this);
        ParallaxDirective.schedule();
      }, { rootMargin: '10% 0px' });
      this.io.observe(this.el);
      if (!ParallaxDirective.bound) {
        ParallaxDirective.bound = true;
        addEventListener('scroll', ParallaxDirective.schedule, { passive: true });
        addEventListener('resize', ParallaxDirective.schedule, { passive: true });
      }
    });
  }

  ngOnDestroy() { this.io?.disconnect(); ParallaxDirective.items.delete(this); }
}

/** Disallows digits (0-9) from being typed, pasted, or inputted. */
@Directive({ selector: '[noDigits]', standalone: true })
export class NoDigitsDirective {
  private el = inject(ElementRef).nativeElement as HTMLInputElement;

  @HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
    // Block numeric digits 0-9 (both top row and numpad)
    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.pulseWarning();
    }
  }

  @HostListener('input') onInput() {
    if (this.el && /\d/.test(this.el.value)) {
      this.el.value = this.el.value.replace(/\d/g, '');
      this.el.dispatchEvent(new Event('input'));
      this.pulseWarning();
    }
  }

  @HostListener('paste', ['$event']) onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') || '';
    if (/\d/.test(text)) {
      e.preventDefault();
      const clean = text.replace(/\d/g, '');
      const start = this.el.selectionStart ?? 0;
      const end = this.el.selectionEnd ?? 0;
      const val = this.el.value;
      this.el.value = val.substring(0, start) + clean + val.substring(end);
      this.el.selectionStart = this.el.selectionEnd = start + clean.length;
      this.el.dispatchEvent(new Event('input'));
      this.pulseWarning();
    }
  }

  private pulseWarning() {
    const parent = this.el.closest('.field');
    if (parent) {
      parent.classList.add('shake');
      setTimeout(() => parent.classList.remove('shake'), 400);
    }
  }
}
