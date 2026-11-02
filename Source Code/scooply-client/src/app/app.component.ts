import { Component, HostListener, NgZone, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import AOS from 'aos';
import { Auth } from './core/auth.service';
import { Api, errMsg } from './core/api.service';
import { ToastService } from './core/toast.service';

/** App shell: brand intro, navbar (8 SRS menus), mobile menu, footer, toasts, scroll progress, light/dark theme. */
@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
  <div class="pl" [class.done]="loaded()" [class.quick]="quickIntro" role="status" aria-label="Loading Scooply">
    <div class="pl-stage" aria-hidden="true">
      <svg class="pl-cone" viewBox="0 -18 160 250">
        <defs><clipPath id="plConeClip"><path d="M38,120 L122,120 L84,224 Q80,232 76,224 Z"/></clipPath></defs>
        <path class="cone" d="M38,120 L122,120 L84,224 Q80,232 76,224 Z"/>
        <g clip-path="url(#plConeClip)"><path class="waffle" d="M30,130 L110,220 M48,120 L128,210 M66,120 L140,200 M20,150 L90,230 M130,130 L50,220 M112,120 L32,210 M94,120 L20,200 M140,150 L70,230"/></g>
        <rect class="rim" x="34" y="112" width="92" height="14" rx="7"/>
        <g class="sc s1">
          <path class="drip" d="M98,114 v18 a5.5,5.5 0 0 1 -11,0 v-16 Z" fill="#c9da9e"/>
          <path d="M36,112 a44,40 0 0 1 88,0 q-7.33,11 -14.67,0 q-7.33,11 -14.67,0 q-7.33,11 -14.67,0 q-7.33,11 -14.67,0 q-7.33,11 -14.67,0 q-7.33,11 -14.67,0 Z" fill="#c9da9e" stroke="#a6bc76" stroke-width="2"/>
          <ellipse class="shine" cx="58" cy="90" rx="9" ry="4.5" transform="rotate(-32 58 90)"/>
        </g>
        <g class="sc s2">
          <path d="M42,80 a38,34 0 0 1 76,0 q-7.6,10 -15.2,0 q-7.6,10 -15.2,0 q-7.6,10 -15.2,0 q-7.6,10 -15.2,0 q-7.6,10 -15.2,0 Z" fill="#f2b0bb" stroke="#e08b9b" stroke-width="2"/>
          <ellipse class="shine" cx="62" cy="60" rx="8" ry="4" transform="rotate(-32 62 60)"/>
        </g>
        <g class="sc s3">
          <path d="M48,50 a32,30 0 0 1 64,0 q-8,10 -16,0 q-8,10 -16,0 q-8,10 -16,0 q-8,10 -16,0 Z" fill="#7a4f37" stroke="#5e3a27" stroke-width="2"/>
          <ellipse class="shine" cx="66" cy="31" rx="6" ry="3" transform="rotate(-32 66 31)" style="opacity:.22"/>
          <rect class="spr" style="--i:0" x="56" y="32" width="8" height="2.8" rx="1.4" fill="#f6e2ae" transform="rotate(30 60 33)"/>
          <rect class="spr" style="--i:1" x="70" y="25" width="8" height="2.8" rx="1.4" fill="#f2b0bb" transform="rotate(-20 74 26)"/>
          <rect class="spr" style="--i:2" x="85" y="33" width="8" height="2.8" rx="1.4" fill="#dfe5c9" transform="rotate(50 89 34)"/>
          <rect class="spr" style="--i:3" x="64" y="41" width="8" height="2.8" rx="1.4" fill="#ffffff" transform="rotate(-40 68 42)"/>
          <rect class="spr" style="--i:4" x="93" y="43" width="8" height="2.8" rx="1.4" fill="#f6e2ae" transform="rotate(15 97 44)"/>
          <rect class="spr" style="--i:5" x="77" y="39" width="8" height="2.8" rx="1.4" fill="#f2b0bb" transform="rotate(70 81 40)"/>
        </g>
        <g class="cherry">
          <path d="M83,4 q2,-12 12,-17" fill="none" stroke="#5a3a1f" stroke-width="2" stroke-linecap="round"/>
          <circle cx="82" cy="12" r="9" fill="#c8323c"/><circle cx="79" cy="9" r="2.5" fill="#fff" opacity=".55"/>
        </g>
      </svg>
      <div class="pl-word">@for (ch of brandLetters; track $index) { <span [style.--i]="$index">{{ ch }}</span> }</div>
      <p class="pl-tag">Crafted scoop by scoop</p>
      <div class="pl-bar"><i></i></div>
    </div>
    <svg class="pl-drip" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
      <path fill="currentColor" d="M0 0h1440v14c-30 0-38 34-62 34s-22-26-50-26-30 58-64 58-34-46-66-46-30 20-64 20-40-32-80-32-30 44-70 44-40-36-74-36-40 18-80 18-36-40-72-40-38 62-76 62-36-48-70-48-44 24-82 24-34-28-68-28-40 38-80 38-38-30-74-30-38 14-72 14S30 14 0 14Z"/>
    </svg>
  </div>
  <div id="scrollbar" [style.width.%]="progress()"></div>

  @if (!isAdminArea()) {
  <header class="nav" [class.scrolled]="scrolled() || open()" [class.hidden]="navHidden() && !open() && !menu()">
    <div class="nav-in">
      <a routerLink="/" class="nav-brand" aria-label="Scooply home" (click)="go()">
        <img src="/images/logo-icon.png" alt=""><span>Scooply</span>
      </a>

      <nav class="nav-links" aria-label="Main menu">
        @for (l of links; track l.to) {
          <a [routerLink]="l.to" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: l.to === '/' }">{{ l.label }}</a>
        }
      </nav>

      <div class="nav-actions">
        <button class="icon-btn theme-btn" (click)="toggleTheme($event)" [attr.aria-label]="dark() ? 'Switch to light theme' : 'Switch to dark theme'" [title]="dark() ? 'Light theme' : 'Dark theme'">
          <i class="fa-solid" [class.fa-sun]="dark()" [class.fa-moon]="!dark()"></i>
        </button>
        @if (!auth.isMember()) {
          <a routerLink="/account/login" class="nav-login desktop-only">Log in</a>
          <a routerLink="/account/register" class="btn sm desktop-only">Join Scooply</a>
        } @else {
          <div class="user-dd desktop-only" (mouseleave)="menu.set(false)">
            <button class="avatar" (click)="menu.set(!menu())" aria-haspopup="true" [attr.aria-expanded]="menu()" [title]="auth.session()?.fullName || 'Account'">{{ initial() }}</button>
            @if (menu()) {
              <div class="menu" role="menu">
                <div class="menu-head"><b>{{ auth.session()?.fullName || 'Member' }}</b><small>Scooply member</small></div>
                @for (m of memberLinks; track m.label) {
                  <a [routerLink]="m.to" [fragment]="m.fragment" (click)="go()" role="menuitem"><i class="fa-solid {{ m.icon }}"></i>{{ m.label }}</a>
                }
                <button (click)="auth.logout(); go()" role="menuitem"><i class="fa-solid fa-arrow-right-from-bracket"></i>Log out</button>
              </div>
            }
          </div>
        }
        <button class="burger" [class.open]="open()" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-controls="mnav" aria-label="Menu"><i></i><i></i></button>
      </div>
    </div>
  </header>

  <div class="mnav" id="mnav" [class.open]="open()" [attr.aria-hidden]="!open()">
    <nav class="mnav-links" aria-label="Mobile menu">
      @for (l of links; track l.to) {
        <a [routerLink]="l.to" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: l.to === '/' }" (click)="go()">{{ l.label }}</a>
      }
    </nav>
    <div class="mnav-foot">
      @if (!auth.isMember()) {
        <a routerLink="/account/login" (click)="go()"><i class="fa-solid fa-arrow-right-to-bracket"></i> Log in</a>
        <a routerLink="/account/register" class="btn" (click)="go()">Join Scooply</a>
      } @else {
        @for (m of memberLinks; track m.label) {
          <a [routerLink]="m.to" [fragment]="m.fragment" (click)="go()"><i class="fa-solid {{ m.icon }}"></i> {{ m.label }}</a>
        }
        <button (click)="auth.logout(); go()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log out</button>
      }
    </div>
  </div>
  }

  <router-outlet />

  @if (!hideFooter()) {
  <footer class="ft">
    <svg class="ft-drip" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true">
      <path fill="currentColor" d="M0 0h1440v8c-40 0-52 22-74 22s-26-14-58-14-36 30-70 30-40-26-78-26-42 12-80 12-46-18-92-18-38 26-84 26-44-20-82-20-46 10-88 10-40-22-82-22-44 34-88 34-40-24-80-24-50 14-92 14-38-16-78-16-46 22-90 22-42-18-84-18-44 8-82 8S36 8 0 8Z"/>
    </svg>
    <div class="container">
      <div class="ft-grid">
        <div>
          <div class="ft-brand"><img src="/images/logo-icon.png" alt=""><span>Scooply</span></div>
          <p>{{ site()?.site?.shopName || 'Scooply Ice Cream Parlor' }} — crafted scoop by scoop since 1998.@if (site()?.site?.ownerName) { Founded by {{ site()?.site?.ownerName }}. }</p>
          <div class="socials">
            <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
            <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <div class="ft-links">
            <a routerLink="/recipes">All recipes</a>
            <a routerLink="/recipes/most-famous">Most famous flavors</a>
            <a routerLink="/books">Recipe books</a>
            <a routerLink="/books/track">Track an order</a>
            <a routerLink="/about">Our story</a>
            <a routerLink="/account/register">Membership</a>
          </div>
        </div>
        <div>
          <h4>Visit us</h4>
          <div class="ft-contact">
            @if (site()?.site; as s) {
              <span><i class="fa-solid fa-location-dot"></i>{{ s.address }}</span>
              <span><i class="fa-solid fa-phone"></i>{{ s.phone }}</span>
              <span><i class="fa-solid fa-envelope"></i>{{ s.email }}</span>
              <span><i class="fa-regular fa-clock"></i>{{ s.workingHours }}</span>
            }
          </div>
        </div>
        <div>
          <h4>The scoop, monthly</h4>
          <p>New flavors, contest winners and a free recipe every month. No spam.</p>
          <form class="news" (ngSubmit)="subscribe()" novalidate>
            <input [(ngModel)]="newsEmail" name="news" type="email" placeholder="Your email address" aria-label="Newsletter email">
            <button type="submit">Subscribe <i class="fa-solid fa-arrow-right"></i></button>
          </form>
        </div>
      </div>
      @if (site()?.branches?.length) {
        <div class="ft-branches">@for (b of site()?.branches; track b.branchId) { <span><b>{{ b.name }}</b>{{ b.address }}</span> }</div>
      }
    </div>
    <div class="container ft-bottom">
      <span>© {{ year }} Scooply. Crafted scoop by scoop.</span>
      <span><a routerLink="/faq">FAQs</a> · <a routerLink="/contact">Contact</a> · <a routerLink="/admin/login">Admin</a></span>
    </div>
    <div class="ft-word" aria-hidden="true">Scooply</div>
  </footer>
  }

  <button class="totop" [class.show]="progress() > 8" (click)="top()" aria-label="Back to top">
    <svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="24" pathLength="100" stroke-dasharray="100" [attr.stroke-dashoffset]="100 - progress()"/></svg>
    <i class="fa-solid fa-arrow-up"></i>
  </button>

  <div class="toasts" aria-live="polite">@for (t of toast.toasts(); track t.id) { <div [class]="'toast ' + t.type" (click)="toast.dismiss(t.id)">{{ t.text }}</div> }</div>`
})
export class AppComponent implements OnInit {
  auth = inject(Auth); toast = inject(ToastService);
  private api = inject(Api); private router = inject(Router); private zone = inject(NgZone);

  loaded = signal(false); scrolled = signal(false); navHidden = signal(false); progress = signal(0);
  open = signal(false); menu = signal(false);
  dark = signal(document.documentElement.dataset['theme'] === 'dark');
  isAdminArea = signal(false); hideFooter = signal(false); site = signal<any>(null);
  newsEmail = ''; year = new Date().getFullYear();
  brandLetters = 'Scooply'.split('');
  /** Full intro on the first visit of a session, a faster cut on later reloads. */
  quickIntro = (() => { try { return !!sessionStorage.getItem('scooply.intro'); } catch { return false; } })();

  links = [
    { to: '/', label: 'Home' }, { to: '/recipes/free', label: 'Free Recipes' }, { to: '/recipes/submit', label: 'Add Recipe' },
    { to: '/books', label: 'Books' }, { to: '/contact', label: 'Contact' }, { to: '/feedback', label: 'Feedback' }, { to: '/faq', label: 'FAQs' }
  ];
  memberLinks: { to: string; label: string; icon: string; fragment?: string }[] = [
    { to: '/member/dashboard', label: 'Dashboard', icon: 'fa-gauge' },
    { to: '/member/orders', label: 'My orders', icon: 'fa-box' },
    { to: '/member/submissions', label: 'My submissions', icon: 'fa-scroll' },
    { to: '/member/dashboard', label: 'Membership', icon: 'fa-crown', fragment: 'membership' },
    { to: '/recipes/most-famous', label: 'Most famous flavors', icon: 'fa-star' }
  ];

  private revealIo?: IntersectionObserver;

  ngOnInit() {
    this.zone.runOutsideAngular(() => { this.setupScrollListener(); setTimeout(() => this.prepReveal(), 100); });
    AOS.init({ duration: 1000, once: true, offset: 60, easing: 'ease-out-cubic', disable: () => matchMedia('(prefers-reduced-motion: reduce)').matches });

    // Brand intro: the cone builds itself, then the sheet lifts away. Page entrance animations stay paused
    // (html.booting) until the curtain starts to rise, so the hero animates in front of the visitor.
    try { sessionStorage.setItem('scooply.intro', '1'); } catch { /* storage blocked */ }
    const root = document.documentElement;
    root.classList.add('booting');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // the intro ends when its progress bar finishes (so it always plays in full), with a hard cap as a fallback
    const introDone = new Promise<void>(res => {
      if (reduce) { setTimeout(res, 400); return; }
      setTimeout(res, 7000);
      requestAnimationFrame(() => document.querySelector('.pl-bar i')?.addEventListener('animationend', () => setTimeout(res, 250), { once: true }));
    });
    const fonts = (document as any).fonts?.ready ?? Promise.resolve();
    Promise.all([introDone, Promise.race([fonts, new Promise(r => setTimeout(r, 4500))])]).then(() => {
      this.loaded.set(true);
      setTimeout(() => root.classList.remove('booting'), 250);
    });

    const checkRoutes = () => {
      const url = this.router.url.split('?')[0].split('#')[0];
      this.isAdminArea.set(url.startsWith('/admin') && url !== '/admin/login');
      this.hideFooter.set(url.startsWith('/account/') || url.startsWith('/admin'));
    };
    checkRoutes();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      checkRoutes(); this.go(); this.navHidden.set(false);
      setTimeout(() => AOS.refreshHard(), 300);
      setTimeout(() => this.prepReveal(), 150);
    });
    this.api.get('public/site').subscribe({ next: s => this.site.set(s), error: () => {} });
    this.auth.refresh();
  }

  initial() { return (this.auth.session()?.fullName || 'M').trim().charAt(0).toUpperCase(); }

  /** Soft reveal for cards / titles on pages that don't use AOS attributes. */
  private prepReveal() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const sel = '.page .title, .page .card, .page .timeline .it, .page .table-wrap, .page .empty';
    const skip = '[data-aos], swiper-container, .modal, .modal-bg, .toasts, .admin';
    this.revealIo ??= new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target as HTMLElement;
      this.revealIo?.unobserve(el);
      el.classList.add('fx-in');
      setTimeout(() => { el.classList.remove('fx-pre', 'fx-in'); el.style.removeProperty('--fx-d'); }, 1300);
    }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      if (el.dataset['fx'] || el.closest(skip)) return;
      el.dataset['fx'] = '1';
      if (el.getBoundingClientRect().top < innerHeight * 0.92) return;    // already on screen: never hide it
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.matches(sel)) : [];
      el.style.setProperty('--fx-d', Math.min(sibs.indexOf(el), 5) * 0.07 + 's');
      el.classList.add('fx-pre');
      this.revealIo?.observe(el);
    });
  }

  /** Scroll progress, "scrolled" nav state and hide-on-scroll-down (runs outside Angular). */
  private setupScrollListener() {
    let queued = false, lastY = scrollY;
    addEventListener('scroll', () => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
        const pct = max > 0 ? Math.min(100, Math.round((y / max) * 100)) : 0;
        const isScrolled = y > 24;
        const hide = y > 260 && y > lastY + 2 ? true : y < lastY - 2 ? false : this.navHidden();
        lastY = y;
        if (isScrolled !== this.scrolled() || hide !== this.navHidden() || Math.abs(this.progress() - pct) >= 1)
          this.zone.run(() => { this.scrolled.set(isScrolled); this.navHidden.set(hide); this.progress.set(pct); });
      });
    }, { passive: true });
  }

  go() { this.menu.set(false); this.open.set(false); }
  /** Switches theme with a circular reveal from the toggle (View Transitions), so colours never mix mid-change. */
  toggleTheme(e?: MouseEvent) {
    const apply = () => {
      this.dark.update(d => !d);
      const t = this.dark() ? 'dark' : 'light';
      document.documentElement.dataset['theme'] = t;
      try { localStorage.setItem('scooply.theme', t); } catch { /* private mode */ }
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    const x = e?.clientX ?? innerWidth - 60, y = e?.clientY ?? 40;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' });
    });
  }
  top() { scrollTo({ top: 0, behavior: 'smooth' }); }
  subscribe() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newsEmail)) { this.toast.error('Please enter a valid email.'); return; }
    this.api.post('public/newsletter', { email: this.newsEmail }).subscribe({
      next: (r: any) => { this.toast.success(r.message); this.newsEmail = ''; }, error: e => this.toast.error(errMsg(e)) });
  }

  @HostListener('document:keydown.escape') onEsc() { this.go(); }
}
