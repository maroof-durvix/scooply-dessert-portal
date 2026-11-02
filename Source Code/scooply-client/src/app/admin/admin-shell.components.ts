import { css } from '../core/util';

import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Api, errMsg } from '../core/api.service';
import { Auth } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { CounterDirective, NoDigitsDirective } from '../core/directives';
Chart.register(...registerables);

/** Separate Admin login page with website navbar and link back to website. */
@Component({
  selector: 'app-admin-login', standalone: true, imports: [FormsModule, RouterLink, NoDigitsDirective],
  template: `<div class="page container" style="max-width:440px;padding-bottom:60px">
    <div class="title" style="margin-bottom:2rem">
      <img src="/images/logo-icon.png" alt="Scooply Logo" style="width:76px;height:76px;border-radius:50%;margin:0 auto 16px;display:block;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:2px solid rgba(var(--accent-rgb), 0.4)">
      <h1>Admin Login</h1>
      <p class="muted" style="margin:10px 0 0">Scooply Control &amp; Management Panel</p>
    </div>
    <form class="card" [class.shake]="shake()" (ngSubmit)="go()">
      @if (error()) { <div class="err" role="alert" style="margin:0 0 12px">{{error()}}</div> }
      <div class="field" [class.invalid]="numErr()"><input id="u" noDigits [(ngModel)]="m.username" (ngModelChange)="onUserChange($event)" (keydown)="filterDigits($event)" name="u" placeholder=" " required autocomplete="username"><label for="u">Admin username</label>@if (numErr()) { <span class="err">Numbers are not allowed in admin username.</span> }</div>
      <div class="field"><input id="p" type="password" [(ngModel)]="m.password" name="p" placeholder=" " required autocomplete="current-password"><label for="p">Password</label></div>
      <button class="btn" style="width:100%" [disabled]="busy()">@if (busy()) { <span class="spinner"></span> } Sign in</button>
      <p class="center mt" style="font-size:0.9rem">
        <a routerLink="/" style="display:inline-flex;align-items:center;gap:6px"><i class="fa-solid fa-arrow-left"></i> Back to Website</a>
        &nbsp;·&nbsp;
        <a routerLink="/account/login">Member Login</a>
      </p>
    </form>
  </div>`
})
export class AdminLoginComponent {
  private auth = inject(Auth); private router = inject(Router);
  m = { username: '', password: '', rememberMe: false }; busy = signal(false); error = signal(''); shake = signal(false); numErr = signal(false);

  filterDigits(e: KeyboardEvent) {
    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.numErr.set(true);
      setTimeout(() => this.numErr.set(false), 2500);
    }
  }

  onUserChange(val: string) {
    if (/\d/.test(val)) {
      this.numErr.set(true);
      this.m.username = (val || '').replace(/\d/g, '');
      setTimeout(() => this.numErr.set(false), 2500);
    }
  }

  go() {
    if (/\d/.test(this.m.username)) {
      this.numErr.set(true);
      this.error.set('Numbers are not allowed in admin username.');
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), 500);
      return;
    }
    this.busy.set(true); this.error.set('');
    this.auth.adminLogin(this.m).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: e => { this.busy.set(false); this.error.set(errMsg(e)); this.shake.set(true); setTimeout(() => this.shake.set(false), 500); }
    });
  }
}

/** Collapsible sidebar layout with top bar, breadcrumbs, website link and dark mode. */
@Component({
  selector: 'app-admin-layout', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="admin" [class.collapsed]="collapsed()">
    <aside class="side" style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px 18px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:12px">
        <a routerLink="/" title="Go to Website" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit">
          <img src="/images/logo-icon.png" alt="Scooply Logo" style="width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(var(--accent-rgb), 0.4);flex-shrink:0">
          <h3 style="color:#fff;margin:0;font-size:1.15rem;font-family:var(--font-serif)">Scooply Admin</h3>
        </a>
      </div>
      <div style="flex:1">
        @for (l of links; track l.p) { <a [routerLink]="l.p" routerLinkActive="active" [routerLinkActiveOptions]="{exact: l.p === '/admin'}"><i [class]="'fa-solid ' + l.i"></i> {{l.t}}</a> }
      </div>
      <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--border)">
        <a routerLink="/" class="btn sm alt" style="width:100%;text-decoration:none;display:flex;justify-content:center;gap:8px" title="Back to public website">
          <i class="fa-solid fa-globe"></i> Visit Website
        </a>
      </div>
    </aside>
    <div style="min-width:0"><div class="row between" style="padding:12px 24px;border-bottom:1px solid var(--border);background:var(--card)">
      <div class="row"><button class="btn sm ghost" (click)="collapsed.set(!collapsed())" aria-label="Toggle sidebar"><i class="fa-solid fa-bars"></i></button><span class="crumbs" style="margin:0">Admin / {{crumb()}}</span></div>
      <div class="row">
        <a routerLink="/" class="btn sm alt" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px" title="Open public website"><i class="fa-solid fa-globe"></i> Website</a>
        <button class="btn sm ghost" (click)="theme()" [attr.aria-label]="'Toggle dark mode'" title="Toggle Dark/Light Mode">
          @if (dark()) { <i class="fa-solid fa-sun" style="color:var(--primary)"></i> }
          @else { <i class="fa-solid fa-moon" style="color:var(--text)"></i> }
        </button>
        <button class="btn sm danger" (click)="auth.logout('/admin/login')">Logout</button>
      </div></div>
      <main><router-outlet /></main></div></div>`
})
export class AdminLayoutComponent {
  auth = inject(Auth); private router = inject(Router); collapsed = signal(false);
  dark = signal(localStorage.getItem('scooply.theme') !== 'light');
  links = [{ p: '/admin', t: 'Dashboard', i: 'fa-gauge' }, { p: '/admin/flavors', t: 'Recipes', i: 'fa-ice-cream' }, { p: '/admin/members', t: 'Members', i: 'fa-users' }, { p: '/admin/payments', t: 'Payments', i: 'fa-credit-card' },
  { p: '/admin/orders', t: 'Book Orders', i: 'fa-truck' }, { p: '/admin/books', t: 'Books', i: 'fa-book' }, { p: '/admin/feedback', t: 'Feedback', i: 'fa-star' }, { p: '/admin/messages', t: 'Contact Messages', i: 'fa-envelope' },
  { p: '/admin/submissions', t: 'Recipe Submissions', i: 'fa-trophy' }, { p: '/admin/settings', t: 'Settings', i: 'fa-gear' }];
  crumb() { return this.links.find(l => l.p === this.router.url.split('?')[0])?.t ?? 'Dashboard'; }
  theme() {
    this.dark.set(!this.dark());
    const t = this.dark() ? 'dark' : 'light';
    document.documentElement.dataset['theme'] = t;
    localStorage.setItem('scooply.theme', t);
  }
}

/** KPI cards + Chart.js charts (revenue, orders by status, new members) styled as high-tech SaaS analytics dashboard. */
@Component({
  selector: 'app-admin-dashboard', standalone: true, imports: [CurrencyPipe, CounterDirective, RouterLink],
  template: `@if (!d()) { <div class="skeleton" style="height:320px;border-radius:24px"></div> } @else {
    <!-- Dashboard Top Header Bar -->
    <div class="admin-overview-header mb" data-aos="fade-down">
      <div>
        <div class="admin-tag-pill">
          <span class="live-pulse-dot"></span>
          <span>DASHBOARD / ANALYTICS</span>
        </div>
        <h2 class="admin-hero-title">Overview</h2>
        <p class="admin-hero-sub">Welcome back, Admin. Real-time platform performance &amp; revenue analytics.</p>
      </div>
      <div class="admin-header-actions">
        <div class="admin-period-pill">
          <i class="fa-regular fa-calendar"></i>
          <span>Last 6 Months</span>
        </div>
        <span class="admin-filter-badge"><i class="fa-solid fa-bolt"></i> Live Feed</span>
      </div>
    </div>

    <!-- 4 High-Tech KPI Metric Cards with Sparklines -->
    <div class="grid g4 mb">
      <!-- 1. Total Revenue -->
      <div class="card kpi-card-pro" data-aos="fade-up">
        <div class="kpi-pro-top">
          <span class="kpi-pro-label">Total Revenue</span>
          <div class="kpi-pro-icon gold"><i class="fa-solid fa-coins"></i></div>
        </div>
        <div class="kpi-pro-val">{{d().revenue.total | currency}}</div>
        <div class="kpi-pro-foot">
          <span class="kpi-pro-badge up"><i class="fa-solid fa-arrow-trend-up"></i> +18.4%</span>
          <svg class="kpi-sparkline" viewBox="0 0 80 24" fill="none">
            <path d="M0 19 Q 20 6, 40 14 T 80 4" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="kpi-pro-detail">Members: {{d().revenue.memberships | currency}} · Books: {{d().revenue.books | currency}}</div>
      </div>

      <!-- 2. Active Memberships -->
      <div class="card kpi-card-pro" data-aos="fade-up" data-aos-delay="60">
        <div class="kpi-pro-top">
          <span class="kpi-pro-label">Active Members</span>
          <div class="kpi-pro-icon purple"><i class="fa-solid fa-crown"></i></div>
        </div>
        <div class="kpi-pro-val"><span [counter]="d().activeMemberships">0</span> <span class="kpi-pro-total-sub">/ {{d().totalMembers}}</span></div>
        <div class="kpi-pro-foot">
          <span class="kpi-pro-badge up"><i class="fa-solid fa-arrow-trend-up"></i> +12.5%</span>
          <svg class="kpi-sparkline" viewBox="0 0 80 24" fill="none">
            <path d="M0 16 Q 20 20, 40 10 T 80 4" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="kpi-pro-detail">{{d().totalMembers}} total registered accounts</div>
      </div>

      <!-- 3. Total Book Orders -->
      <div class="card kpi-card-pro" data-aos="fade-up" data-aos-delay="120">
        <div class="kpi-pro-top">
          <span class="kpi-pro-label">Total Orders</span>
          <div class="kpi-pro-icon blue"><i class="fa-solid fa-truck-fast"></i></div>
        </div>
        <div class="kpi-pro-val" [counter]="d().orders.total">0</div>
        <div class="kpi-pro-foot">
          <span class="kpi-pro-badge up"><i class="fa-solid fa-arrow-trend-up"></i> +15.2%</span>
          <svg class="kpi-sparkline" viewBox="0 0 80 24" fill="none">
            <path d="M0 18 Q 25 8, 45 15 T 80 3" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="kpi-pro-detail">{{d().orders.total}} recipe books ordered</div>
      </div>

      <!-- 4. Attention Queue -->
      <div class="card kpi-card-pro" data-aos="fade-up" data-aos-delay="180">
        <div class="kpi-pro-top">
          <span class="kpi-pro-label">Action Queue</span>
          <div class="kpi-pro-icon amber"><i class="fa-solid fa-hourglass-half"></i></div>
        </div>
        <div class="kpi-pro-val"><span [counter]="d().pendingFeedbacks + d().pendingSubmissions">0</span></div>
        <div class="kpi-pro-foot">
          <span class="kpi-pro-badge alert"><i class="fa-solid fa-clock"></i> Active</span>
          <svg class="kpi-sparkline" viewBox="0 0 80 24" fill="none">
            <path d="M0 12 Q 20 18, 40 8 T 80 14" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="kpi-pro-detail">{{d().pendingSubmissions}} submissions · {{d().pendingFeedbacks}} unread</div>
      </div>
    </div>

    <!-- Analytics Hero Row: Revenue Spline Area (2/3) + Orders Donut Breakdown (1/3) -->
    <div class="analytics-row-pro mb">
      <!-- 1. Revenue Overview Area Chart -->
      <div class="card chart-card-pro" data-aos="fade-up">
        <div class="chart-pro-header">
          <div class="chart-pro-meta">
            <div class="chart-pro-title-wrap">
              <span class="chart-pro-icon gold"><i class="fa-solid fa-chart-line"></i></span>
              <div>
                <h3>Revenue Overview</h3>
                <p class="chart-pro-sub">Gross income trend &bull; Monthly cadence</p>
              </div>
            </div>
            <div class="chart-pro-hero-amt">
              <span class="hero-amt-num">{{d().revenue.total | currency}}</span>
              <span class="hero-pct-badge up"><i class="fa-solid fa-arrow-up"></i> +12.6% vs last period</span>
            </div>
          </div>
          <div class="chart-pro-controls">
            <div class="chart-ctrl-pill">
              <i class="fa-solid fa-calendar-days"></i>
              <span>Monthly Cadence</span>
            </div>
          </div>
        </div>
        <div class="chart-pro-canvas-wrap line-wrap">
          <canvas #rev></canvas>
        </div>
      </div>

      <!-- 2. Orders by Status Donut Chart -->
      <div class="card chart-card-pro" data-aos="fade-up" data-aos-delay="80">
        <div class="chart-pro-header">
          <div class="chart-pro-meta">
            <div class="chart-pro-title-wrap">
              <span class="chart-pro-icon purple"><i class="fa-solid fa-chart-pie"></i></span>
              <div>
                <h3>Orders Breakdown</h3>
                <p class="chart-pro-sub">Fulfillment distribution</p>
              </div>
            </div>
          </div>
          <span class="badge Completed">{{d().orders.total}} Orders</span>
        </div>
        <div class="donut-chart-container">
          <div class="chart-pro-canvas-wrap doughnut-wrap">
            <canvas #ord></canvas>
            <div class="donut-center-overlay">
              <span class="donut-center-num">{{d().orders.total}}</span>
              <span class="donut-center-lbl">Total Orders</span>
            </div>
          </div>
          <div class="donut-status-list">
            @for (s of d().orders.byStatus; track s.status) {
              <div class="donut-status-row">
                <div class="status-indicator">
                  <span class="status-dot" [class]="'dot-' + s.status"></span>
                  <span class="status-name">{{s.status}}</span>
                </div>
                <div class="status-metrics">
                  <span class="status-pct">{{calcPct(s.count, d().orders.total)}}%</span>
                  <span class="status-count">({{s.count}})</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Row: User Growth Bar Chart (1/2) + Live Action Stream (1/2) -->
    <div class="grid g2">
      <!-- 1. Member Growth Bar Chart -->
      <div class="card chart-card-pro" data-aos="fade-up">
        <div class="chart-pro-header">
          <div class="chart-pro-meta">
            <div class="chart-pro-title-wrap">
              <span class="chart-pro-icon blue"><i class="fa-solid fa-chart-column"></i></span>
              <div>
                <h3>Member Growth</h3>
                <p class="chart-pro-sub">New registrations &bull; Last 6 months</p>
              </div>
            </div>
            <div class="chart-pro-hero-amt">
              <span class="hero-amt-num">{{d().totalMembers}}</span>
              <span class="hero-pct-badge up"><i class="fa-solid fa-arrow-up"></i> +8.3% monthly</span>
            </div>
          </div>
        </div>
        <div class="chart-pro-canvas-wrap bar-wrap">
          <canvas #mem></canvas>
        </div>
      </div>

      <!-- 2. Recent Activity & Action Stream -->
      <div class="card chart-card-pro" data-aos="fade-up" data-aos-delay="80">
        <div class="chart-pro-header">
          <div class="chart-pro-meta">
            <div class="chart-pro-title-wrap">
              <span class="chart-pro-icon amber"><i class="fa-solid fa-bolt"></i></span>
              <div>
                <h3>Recent Queue &amp; Actions</h3>
                <p class="chart-pro-sub">Real-time management stream</p>
              </div>
            </div>
          </div>
          <span class="admin-filter-badge"><i class="fa-solid fa-rotate"></i> Live</span>
        </div>

        <div class="activity-feed-list">
          <div class="activity-item">
            <div class="activity-icon-wrap amber"><i class="fa-solid fa-trophy"></i></div>
            <div class="activity-content">
              <div class="activity-title">Recipe Submissions</div>
              <div class="activity-meta">{{d().pendingSubmissions}} submissions awaiting admin review</div>
            </div>
            <a routerLink="/admin/submissions" class="btn sm alt activity-btn">Review</a>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrap blue"><i class="fa-solid fa-star"></i></div>
            <div class="activity-content">
              <div class="activity-title">User Feedback</div>
              <div class="activity-meta">{{d().pendingFeedbacks}} unread customer reviews</div>
            </div>
            <a routerLink="/admin/feedback" class="btn sm alt activity-btn">Inspect</a>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrap purple"><i class="fa-solid fa-box"></i></div>
            <div class="activity-content">
              <div class="activity-title">Book Orders</div>
              <div class="activity-meta">{{d().orders.total}} total orders in fulfillment workflow</div>
            </div>
            <a routerLink="/admin/orders" class="btn sm alt activity-btn">Manage</a>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrap green"><i class="fa-solid fa-id-card"></i></div>
            <div class="activity-content">
              <div class="activity-title">Active Memberships</div>
              <div class="activity-meta">{{d().activeMemberships}} active members enjoying VIP benefits</div>
            </div>
            <a routerLink="/admin/members" class="btn sm alt activity-btn">View</a>
          </div>
        </div>
      </div>
    </div>
  }`
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(Api); d = signal<any>(null);
  @ViewChild('rev') rev!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ord') ord!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mem') mem!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];
  private themeObserver?: MutationObserver;

  ngOnInit() {
    this.themeObserver = new MutationObserver(() => {
      if (this.d()) this.draw(this.d());
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    this.api.get('admin/dashboard').subscribe(d => {
      this.d.set(d);
      setTimeout(() => this.draw(d), 50);
    });
  }

  calcPct(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  private draw(d: any) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const isLight = document.documentElement.dataset['theme'] === 'light';
    const fontSans = "'Plus Jakarta Sans', system-ui, sans-serif";
    const mutedColor = isLight ? '#6b5c50' : '#cbd5e1';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
    const tooltipConfig = {
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(10, 10, 10, 0.96)',
      titleColor: isLight ? '#121212' : '#ffffff',
      bodyColor: isLight ? '#121212' : css('var(--primary)'),
      titleFont: { family: fontSans, weight: 700 as const, size: 12 },
      bodyFont: { family: fontSans, weight: 600 as const, size: 13 },
      borderColor: isLight ? 'rgba(18, 18, 18, 0.2)' : css('rgba(var(--accent-rgb), 0.45)'),
      borderWidth: 1.5,
      padding: 12,
      cornerRadius: 12,
      displayColors: true,
      boxPadding: 6
    };

    // 1. Revenue Line Chart with Lemon Yellow & Charcoal Spline
    const revCtx = this.rev?.nativeElement?.getContext('2d');
    if (revCtx) {
      const grad = revCtx.createLinearGradient(0, 0, 0, 280);
      if (isLight) {
        grad.addColorStop(0, css('rgba(var(--accent-rgb), 0.45)'));
        grad.addColorStop(0.65, css('rgba(var(--accent-rgb), 0.12)'));
        grad.addColorStop(1, css('rgba(var(--accent-rgb), 0.00)'));
      } else {
        grad.addColorStop(0, css('rgba(var(--accent-rgb), 0.45)'));
        grad.addColorStop(0.6, css('rgba(var(--accent-rgb), 0.14)'));
        grad.addColorStop(1, css('rgba(var(--accent-rgb), 0.00)'));
      }

      const revChart = new Chart(this.rev.nativeElement, {
        type: 'line',
        data: {
          labels: d.charts.labels,
          datasets: [{
            label: 'Revenue',
            data: d.charts.revenue,
            borderColor: isLight ? '#121212' : css('var(--primary)'),
            borderWidth: 3.5,
            backgroundColor: grad,
            fill: true,
            tension: 0.42,
            pointRadius: 4.5,
            pointHoverRadius: 8,
            pointBackgroundColor: isLight ? css('var(--primary)') : css('var(--primary)'),
            pointBorderColor: isLight ? '#121212' : '#121212',
            pointBorderWidth: 2.5,
            pointHoverBorderWidth: 3,
            pointHitRadius: 18
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipConfig,
              callbacks: {
                label: (ctx) => ` Revenue: Rs. ${Number(ctx.raw || 0).toLocaleString()}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: mutedColor, font: { family: fontSans, size: 11, weight: 600 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: mutedColor,
                font: { family: fontSans, size: 11 },
                callback: (v) => 'Rs. ' + Number(v).toLocaleString()
              }
            }
          }
        }
      });
      this.charts.push(revChart);
    }

    // 2. Orders Doughnut Chart with Status Accents & Clean Cutout
    const ordCtx = this.ord?.nativeElement?.getContext('2d');
    if (ordCtx) {
      const statusColors: Record<string, string> = {
        Placed: css('var(--primary)'),
        Processing: '#3b82f6',
        Sent: '#a855f7',
        Completed: '#10b981',
        Rejected: '#ef4444',
        Pending: css('var(--primary-hover)')
      };
      const labels = d.orders.byStatus.map((s: any) => s.status);
      const data = d.orders.byStatus.map((s: any) => s.count);
      const bgColors = labels.map((st: string) => statusColors[st] || css('var(--primary-dark)'));

      const ordChart = new Chart(this.ord.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: bgColors,
            borderColor: isLight ? '#ffffff' : '#0a0a0a',
            borderWidth: 2,
            hoverOffset: 7,
            borderRadius: 6,
            spacing: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipConfig,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} Orders`
              }
            }
          }
        }
      });
      this.charts.push(ordChart);
    }

    // 3. New Members Bar Chart with Modern Pillar Gradients
    const memCtx = this.mem?.nativeElement?.getContext('2d');
    if (memCtx) {
      const barGrad = memCtx.createLinearGradient(0, 0, 0, 220);
      if (isLight) {
        barGrad.addColorStop(0, '#121212');
        barGrad.addColorStop(1, 'rgba(18, 18, 18, 0.45)');
      } else {
        barGrad.addColorStop(0, css('var(--primary)'));
        barGrad.addColorStop(1, css('var(--primary-dark)'));
      }

      const memChart = new Chart(this.mem.nativeElement, {
        type: 'bar',
        data: {
          labels: d.charts.labels,
          datasets: [{
            label: 'New Members',
            data: d.charts.newMembers,
            backgroundColor: barGrad,
            hoverBackgroundColor: isLight ? '#1a1a1a' : css('var(--accent-soft)'),
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipConfig,
              callbacks: {
                label: (ctx) => ` Sign-ups: ${ctx.raw} Members`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: mutedColor, font: { family: fontSans, size: 11, weight: 600 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: mutedColor,
                font: { family: fontSans, size: 11 },
                stepSize: 1
              }
            }
          }
        }
      });
      this.charts.push(memChart);
    }
  }
}
