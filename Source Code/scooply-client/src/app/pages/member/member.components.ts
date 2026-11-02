import { css } from '../../core/util';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Api, errMsg, fieldErrors } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CardFormComponent } from '../../shared/card-form.component';
import { confetti, passwordScore } from '../../core/util';
Chart.register(...registerables);

/** Member dashboard: membership ring, quick links, activity graph, recent activity, payments, profile, password, renewal. */
@Component({
  selector: 'app-member-dashboard', standalone: true, imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, RouterLink, CardFormComponent],
  template: `<div class="page container member-dashboard-wrap">
    @if (!d()) { 
      <div class="skeleton" style="height:360px;border-radius:24px"></div> 
    } @else {
      <!-- 1. Ultra-Luxury Executive Glassmorphic Hero & Command Station -->
      <div class="member-hero-pro" data-aos="fade-up">
        <!-- Ambient Background Glow & Circuit Lines -->
        <div class="hero-cosmic-glow"></div>
        <div class="hero-radial-burst"></div>

        <div class="hero-top-row">
          <div class="hero-user-identity">
            <div class="hero-avatar-wrap">
              <div class="hero-avatar-ring"></div>
              <div class="hero-avatar-img">
                <i class="fa-solid fa-crown avatar-fallback-icon"></i>
              </div>
              <span class="hero-online-status" title="Active member"></span>
            </div>
            <div>
              <div class="member-live-status-pill">
                <span class="pulse-dot"></span>
                <span>MEMBER &bull; ACTIVE</span>
              </div>
              <h1 class="member-greeting-heading">
                {{greeting()}}, <span class="member-name-glow">{{d().user.fullName || d().user.username}}</span>
              </h1>
              <p class="member-hero-subtitle">
                Your recipes, orders and contest entries — all in one place.
              </p>
            </div>
          </div>

          <div class="member-hero-badges">
            <div class="member-tier-chip">
              <div class="tier-chip-icon"><i class="fa-solid fa-gem"></i></div>
              <div class="tier-chip-text">
                <span class="tier-chip-label">TIER ACCESS</span>
                <span class="tier-chip-val">{{d().membership?.plan || 'No plan'}}</span>
              </div>
            </div>
            <div class="member-date-chip">
              <div class="date-chip-icon"><i class="fa-regular fa-clock"></i></div>
              <div class="date-chip-text">
                <span class="date-chip-label">SESSION DATE</span>
                <span class="date-chip-val">{{today | date:'mediumDate'}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sleek Futuristic Command / Search Console (Directly inspired by Reference Bar) -->
        <div class="hero-command-bar">
          <div class="command-bar-glow"></div>
          <div class="command-bar-inner">
            <div class="command-bar-leading">
              <div class="command-spark-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
              <input type="text" class="command-input" aria-label="Search recipes and orders" placeholder="Search handcrafted recipes, formulas, orders, or flavor notes..." (keyup.enter)="searchPrompt($event)" #heroSearch />
            </div>
            <div class="command-bar-actions">
              <a routerLink="/recipes" class="command-action-pill"><i class="fa-solid fa-magnifying-glass"></i> Explore</a>
              <a routerLink="/recipes/submit" class="command-action-pill"><i class="fa-solid fa-sparkles"></i> Create</a>
              <button class="command-send-btn" (click)="searchPrompt(heroSearch.value)" title="Execute Search">
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Dual Pro Cards: Celestial Membership Orb + Glassmorphic Quick Action Tiles -->
      <div class="grid g2 mt-pro" id="membership">
        <!-- Celestial Membership Orb Card -->
        <div class="card membership-orb-card-pro center" data-aos="fade-up">
          <div class="orb-card-header">
            <span class="orb-badge"><i class="fa-solid fa-crown"></i> MEMBERSHIP</span>
            <span class="badge" [class]="'badge ' + (d().membership?.active ? 'Completed' : 'Expired')">
              {{d().membership?.active ? 'Active Plan' : 'Expired'}}
            </span>
          </div>

          <div class="celestial-orb-wrapper">
            <div class="celestial-orb-halo"></div>
            <svg width="200" height="200" viewBox="0 0 200 200" class="celestial-ring-svg">
              <defs>
                <linearGradient id="orbRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-soft)" />
                  <stop offset="45%" stop-color="var(--primary)" />
                  <stop offset="100%" stop-color="var(--primary-dark)" />
                </linearGradient>
                <filter id="orbRingGlow" x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <!-- Background Track -->
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(var(--accent-rgb), 0.15)" stroke-width="12"/>
              <!-- Glowing Animated Ring -->
              <circle cx="100" cy="100" r="78" fill="none" stroke="url(#orbRingGrad)" stroke-width="12" stroke-linecap="round"
                stroke-dasharray="490" [attr.stroke-dashoffset]="490 - 490 * ring() / 100"
                transform="rotate(-90 100 100)"
                filter="url(#orbRingGlow)"
                style="transition:stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)"/>
              <!-- Center Metric Text -->
              <text x="100" y="96" text-anchor="middle" font-size="40" font-family="Fraunces, serif" font-weight="400" fill="var(--primary)">
                {{d().membership?.daysRemaining ?? 0}}
              </text>
              <text x="100" y="122" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1.8" fill="var(--muted)">
                DAYS LEFT
              </text>
            </svg>
          </div>

          <div class="orb-plan-details">
            <div class="orb-plan-name">{{d().membership?.plan || 'Member Tier'}}</div>
            @if (d().membership) {
              <div class="orb-plan-dates">
                <span>{{d().membership.startDate | date:'MMM d'}}</span>
                <span class="orb-arrow">&rarr;</span>
                <span>{{d().membership.endDate | date:'MMM d, yyyy'}}</span>
              </div>
            } @else {
              <div class="muted" style="font-size:0.85rem">Join a membership plan to unlock all privileges</div>
            }
          </div>

          <button class="btn btn-pro-orb" (click)="renew.set(!renew())">
            <i class="fa-solid fa-bolt" style="margin-right:6px"></i> {{d().membership?.active ? 'Renew membership' : 'Join or renew'}}
          </button>
        </div>

        <!-- Glassmorphic Suggested Quick Actions Grid (From Reference Image) -->
        <div class="card member-actions-card-pro" data-aos="fade-up" data-aos-delay="60">
          <div class="actions-header-pro">
            <div>
              <h3 style="margin:0 0 2px">Quick links</h3>
              <p class="muted" style="font-size:0.82rem;margin:0">Jump back into the good stuff</p>
            </div>
            <span class="actions-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Shortcuts</span>
          </div>

          <div class="actions-pro-grid">
            <a class="action-tile-pro" routerLink="/recipes">
              <div class="action-tile-icon amber">
                <i class="fa-solid fa-ice-cream"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">Browse Recipes</span>
                <span class="action-tile-sub">All 20 parlour flavors</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>

            <a class="action-tile-pro" routerLink="/recipes/most-famous">
              <div class="action-tile-icon gold">
                <i class="fa-solid fa-crown"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">Famous Flavors</span>
                <span class="action-tile-sub">Our most loved scoops</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>

            <a class="action-tile-pro" routerLink="/recipes/submit">
              <div class="action-tile-icon purple">
                <i class="fa-solid fa-trophy"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">Submit Recipe</span>
                <span class="action-tile-sub">Win prize rewards</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>

            <a class="action-tile-pro" routerLink="/member/orders">
              <div class="action-tile-icon blue">
                <i class="fa-solid fa-truck-fast"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">My Orders</span>
                <span class="action-tile-sub">Track your book orders</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>

            <a class="action-tile-pro" routerLink="/member/submissions">
              <div class="action-tile-icon teal">
                <i class="fa-solid fa-award"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">My Submissions</span>
                <span class="action-tile-sub">Status & certificates</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>

            <a class="action-tile-pro" routerLink="/books">
              <div class="action-tile-icon red">
                <i class="fa-solid fa-book-open"></i>
              </div>
              <div class="action-tile-body">
                <span class="action-tile-title">Recipe books</span>
                <span class="action-tile-sub">Order a printed copy</span>
              </div>
              <i class="fa-solid fa-arrow-right action-tile-arrow"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- 3. Professional Spending & Activity Neon Spline Analytics (Inspired directly by Reference Image Credit Balance Graph) -->
      <div class="card user-chart-card-pro mt-pro" data-aos="fade-up">
        <div class="user-chart-header-pro">
          <div class="user-chart-headline">
            <div class="user-chart-icon-wrap">
              <i class="fa-solid fa-wave-pulse"></i>
            </div>
            <div>
              <div class="user-chart-kicker">YOUR ACTIVITY</div>
              <h3 class="user-chart-title">Spending over time</h3>
            </div>
          </div>

          <div class="user-chart-meta-row">
            <div class="user-chart-stat-block">
              <span class="user-chart-stat-label">Total Period Volume</span>
              <span class="user-chart-stat-value">Rs. {{totalSpending() | number:'1.0-0'}}</span>
            </div>
            <div class="user-chart-trend-badge">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>Active Tier</span>
            </div>
            <div class="user-chart-period-tag">
              <i class="fa-regular fa-clock"></i> Last 6 Months
            </div>
          </div>
        </div>

        <div class="user-chart-canvas-container">
          <canvas #userChart></canvas>
        </div>
      </div>

      <!-- 4. Membership Renewal Dropdown -->
      @if (renew()) { 
        <form class="card mt-pro glass-form-pro" (ngSubmit)="doRenew()">
          <div class="form-header-pro">
            <h3><i class="fa-solid fa-bolt" style="color:var(--primary);margin-right:8px"></i> Renew your membership</h3>
            <p class="muted" style="margin:0;font-size:0.85rem">Select your tier to continue seamless access to elite recipes</p>
          </div>
          <div class="radio-pills mt">
            @for (p of plans(); track p.planId) { 
              <label>
                <input type="radio" name="rp" [value]="p.planId" [(ngModel)]="planId">
                <span>{{p.name}} – {{p.price | currency}}</span>
              </label> 
            }
          </div>
          <app-card-form #card/>
          <button class="btn btn-pay-renew" [disabled]="busy()">
            @if (busy()) { <span class="spinner"></span> } 
            <i class="fa-solid fa-shield-check"></i> Secure Pay &amp; Renew
          </button>
        </form> 
      }

      <!-- 5. Recent Activity Split: Orders & Submissions -->
      <div class="grid g2 mt-pro">
        <div class="card recent-stream-card">
          <div class="stream-header">
            <h3><i class="fa-solid fa-bag-shopping" style="color:var(--primary);margin-right:8px"></i> Recent Orders</h3>
            <a routerLink="/member/orders" class="stream-view-all">View all &rarr;</a>
          </div>
          <div class="stream-list">
            @for (o of d().orders; track o.orderNumber) { 
              <div class="stream-row">
                <div class="stream-row-icon amber"><i class="fa-solid fa-box-check"></i></div>
                <div class="stream-row-content">
                  <div class="stream-row-title">{{o.orderNumber}} · {{o.bookTitle}}</div>
                  <div class="stream-row-sub">Total: {{o.totalCost | currency}}</div>
                </div>
                <span [class]="'badge ' + o.status">{{o.status}}</span>
              </div> 
            } @empty { 
              <div class="empty-stream"><i class="fa-regular fa-basket-shopping"></i> No orders placed yet.</div> 
            }
          </div>
        </div>

        <div class="card recent-stream-card">
          <div class="stream-header">
            <h3><i class="fa-solid fa-mortar-pestle" style="color:var(--primary);margin-right:8px"></i> My Submissions</h3>
            <a routerLink="/member/submissions" class="stream-view-all">View all &rarr;</a>
          </div>
          <div class="stream-list">
            @for (s of d().submissions; track s.submissionId) { 
              <div class="stream-row">
                <div class="stream-row-icon purple"><i class="fa-solid fa-star"></i></div>
                <div class="stream-row-content">
                  <div class="stream-row-title">{{s.recipeTitle}}</div>
                  <div class="stream-row-sub">Submitted {{s.submittedAt | date:'mediumDate'}}</div>
                </div>
                <div class="stream-row-right">
                  <span [class]="'badge ' + s.status">{{s.status}}</span>
                  @if (s.prizeAmount) { <span class="prize-tag">+{{s.prizeAmount | currency}}</span> }
                </div>
              </div> 
            } @empty { 
              <div class="empty-stream"><i class="fa-regular fa-file-lines"></i> No recipe submissions yet.</div> 
            }
          </div>
        </div>
      </div>

      <!-- 6. Payment History Ledger -->
      <div class="card mt-pro table-card-pro">
        <div class="table-card-header">
          <div>
            <h3><i class="fa-solid fa-receipt" style="color:var(--primary);margin-right:8px"></i> Payments</h3>
            <p class="muted" style="margin:0;font-size:0.82rem">Every payment made on your account</p>
          </div>
          <span class="table-status-pill"><i class="fa-solid fa-shield-halved"></i> 256-bit Encrypted</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Transaction Type</th>
                <th>Amount</th>
                <th>Card Last 4</th>
                <th>Status</th>
                <th>Reference ID</th>
              </tr>
            </thead>
            <tbody>
              @for (p of d().payments; track p.transactionRef) { 
                <tr>
                  <td>{{p.paidAt | date:'medium'}}</td>
                  <td><strong>{{p.type}}</strong></td>
                  <td class="amount-cell">{{p.amount | currency}}</td>
                  <td><span class="card-pill">•••• {{p.cardLast4}}</span></td>
                  <td><span [class]="'badge ' + p.status">{{p.status}}</span></td>
                  <td class="ref-cell">{{p.transactionRef}}</td>
                </tr> 
              } @empty {
                <tr><td colspan="6" class="center muted" style="padding:24px">No payment records found.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7. Profile & Security Dual Columns -->
      <div class="grid g2 mt-pro">
        <form class="card glass-form-pro" (ngSubmit)="saveProfile()">
          <div class="form-header-pro">
            <h3><i class="fa-regular fa-id-badge" style="color:var(--primary);margin-right:8px"></i> Personal Credentials</h3>
            <p class="muted" style="margin:0;font-size:0.82rem">Update contact information for deliveries</p>
          </div>
          <div class="field mt"><input id="pn" [(ngModel)]="prof.fullName" name="pn" placeholder=" "><label for="pn">Full Name</label></div>
          <div class="field"><input id="pp" [(ngModel)]="prof.phone" name="pp" placeholder=" "><label for="pp">Phone Number</label></div>
          <div class="field"><textarea id="pa" [(ngModel)]="prof.address" name="pa" placeholder=" " style="min-height:85px"></textarea><label for="pa">Delivery Address</label></div>
          <div class="account-creds-preview">
            <span><strong>Username:</strong> {{d().user.username}}</span>
            <span>&bull;</span>
            <span><strong>Email:</strong> {{d().user.email}}</span>
          </div>
          <button class="btn btn-save-pro">Save Profile Details</button>
        </form>

        <form class="card glass-form-pro" (ngSubmit)="changePw()">
          <div class="form-header-pro">
            <h3><i class="fa-solid fa-lock" style="color:var(--primary);margin-right:8px"></i> Security &amp; Access</h3>
            <p class="muted" style="margin:0;font-size:0.82rem">Maintain strong password authentication</p>
          </div>
          <div class="field mt"><input id="cp" type="password" [(ngModel)]="pw.cur" name="cp" placeholder=" "><label for="cp">Current Password</label></div>
          <div class="field"><input id="np" type="password" [(ngModel)]="pw.new" name="np" placeholder=" "><label for="np">New Password</label></div>
          <div class="strength" [class]="'strength s' + score()"><i></i><i></i><i></i><i></i><i></i></div>
          <button class="btn btn-save-pro" [disabled]="score() < 5">Update Password</button>
        </form>
      </div> 
    }
  </div>`
})
export class MemberDashboardComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService); private auth = inject(Auth);
  private router = inject(Router);
  @ViewChild('card') card?: CardFormComponent;
  @ViewChild('userChart') userChartRef?: ElementRef<HTMLCanvasElement>;
  d = signal<any>(null); plans = signal<any[]>([]); renew = signal(false); busy = signal(false); ring = signal(0); planId = 0;
  totalSpending = signal<number>(0);
  prof = { fullName: '', phone: '', address: '' }; pw = { cur: '', new: '' };
  today = new Date();
  private userChartInstance?: Chart;
  private themeObserver?: MutationObserver;

  searchPrompt(input: any) {
    const val = typeof input === 'string' ? input.trim() : (input.target?.value || '').trim();
    if (val) {
      this.router.navigate(['/recipes'], { queryParams: { q: val } });
    } else {
      this.router.navigate(['/recipes']);
    }
  }

  ngOnInit() {
    this.load();
    this.api.get('public/plans').subscribe(p => { this.plans.set(p); this.planId = p[0]?.planId; });

    // Listen for dark/light mode changes to re-render chart seamlessly
    this.themeObserver = new MutationObserver(() => {
      if (this.d()) this.drawUserChart(this.d());
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  greeting(): string {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  score() { return passwordScore(this.pw.new); }

  load() {
    this.api.get('member/dashboard').subscribe(d => {
      this.d.set(d);
      this.prof = { fullName: d.user.fullName, phone: d.user.phone, address: d.user.address };
      
      const total = (d.payments || [])
        .filter((p: any) => p.status === 'Success' || p.status === 'Completed')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      this.totalSpending.set(total);

      setTimeout(() => {
        this.ring.set(d.membership?.percentLeft ?? 0);
        this.drawUserChart(d);
      }, 100);
    });
  }

  private drawUserChart(d: any) {
    if (!this.userChartRef?.nativeElement) return;
    if (this.userChartInstance) {
      this.userChartInstance.destroy();
      this.userChartInstance = undefined;
    }

    const ctx = this.userChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Generate last 6 months buckets
    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: dt.toLocaleDateString('en-US', { month: 'short' }),
        year: dt.getFullYear(),
        month: dt.getMonth()
      });
    }

    const spending = months.map(m => {
      return (d.payments || [])
        .filter((p: any) => {
          const dt = new Date(p.paidAt);
          return dt.getFullYear() === m.year && dt.getMonth() === m.month && (p.status === 'Success' || p.status === 'Completed');
        })
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    });

    const isDark = document.documentElement.dataset['theme'] !== 'light';
    const fontSans = "'Plus Jakarta Sans', system-ui, sans-serif";

    // Neon glowing spline gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    if (isDark) {
      grad.addColorStop(0, css('rgba(var(--accent-rgb), 0.45)'));
      grad.addColorStop(0.4, css('rgba(var(--accent-rgb), 0.18)'));
      grad.addColorStop(0.8, css('rgba(var(--accent-rgb), 0.05)'));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.00)');
    } else {
      grad.addColorStop(0, css('rgba(var(--accent-rgb), 0.45)'));
      grad.addColorStop(0.5, css('rgba(var(--accent-rgb), 0.15)'));
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    }

    this.userChartInstance = new Chart(this.userChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: 'Spending',
          data: spending,
          borderColor: isDark ? css('var(--primary)') : '#121212',
          borderWidth: 3.5,
          backgroundColor: grad,
          fill: true,
          tension: 0.42,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: isDark ? css('var(--primary)') : css('var(--primary)'),
          pointBorderColor: isDark ? '#121212' : '#121212',
          pointBorderWidth: 2.5,
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 12, right: 12, bottom: 4, left: 6 }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(10, 10, 10, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            titleColor: isDark ? '#ffffff' : '#121212',
            bodyColor: isDark ? css('var(--primary)') : '#121212',
            titleFont: { family: fontSans, weight: 700, size: 12 },
            bodyFont: { family: fontSans, weight: 600, size: 13 },
            borderColor: isDark ? css('rgba(var(--accent-rgb), 0.45)') : 'rgba(18, 18, 18, 0.2)',
            borderWidth: 1.5,
            padding: 12,
            cornerRadius: 14,
            displayColors: false,
            callbacks: {
              title: (items) => `Month: ${items[0]?.label}`,
              label: (c) => ` Total Spent: Rs. ${Number(c.raw || 0).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: isDark ? '#cbd5e1' : '#121212',
              font: { family: fontSans, size: 12, weight: 600 }
            }
          },
          y: {
            border: { display: false },
            grid: {
              color: isDark ? css('rgba(var(--accent-rgb), 0.12)') : 'rgba(18, 18, 18, 0.08)',
              tickBorderDash: [5, 5]
            },
            ticks: {
              color: isDark ? '#94a3b8' : css('var(--card)'),
              font: { family: fontSans, size: 11, weight: 500 },
              callback: (v) => 'Rs. ' + Number(v).toLocaleString()
            }
          }
        }
      }
    });
  }

  saveProfile() {
    this.api.put('member/profile', this.prof).subscribe({
      next: (r: any) => { this.toast.success(r.message); this.auth.refresh(); },
      error: e => this.toast.error(errMsg(e))
    });
  }

  changePw() {
    this.api.post('member/change-password', { currentPassword: this.pw.cur, newPassword: this.pw.new }).subscribe({
      next: (r: any) => { this.toast.success(r.message); this.pw = { cur: '', new: '' }; },
      error: e => this.toast.error(errMsg(e))
    });
  }

  doRenew() {
    if (!this.card!.validate()) return;
    this.busy.set(true);
    this.api.post('member/renew', { planId: this.planId, card: this.card!.value() }).subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.toast.success(r.message);
        confetti();
        this.renew.set(false);
        this.auth.refresh();
        this.load();
      },
      error: e => {
        this.busy.set(false);
        if (e.status === 400 && e.error?.errors) this.card!.setServerErrors(fieldErrors(e));
        this.toast.error(errMsg(e));
      }
    });
  }
}

/** My Orders with status badges and a mini progress stepper. */
@Component({
  selector: 'app-member-orders', standalone: true, imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `<div class="page container"><div class="title"><h1>My Orders</h1></div>
    @for (o of items(); track o.orderNumber) { <div class="card mb"><div class="row between"><b>{{o.orderNumber}}</b><span [class]="'badge ' + o.status">{{o.status}}</span></div>
      <p class="muted" style="margin:4px 0">{{o.bookTitle}} × {{o.quantity}} · {{o.totalCost | currency}} · {{o.orderedAt | date:'medium'}}</p>
      <div class="stepper" style="margin:14px 0 0"><div class="bar" [style.width.%]="o.statusStep / 3 * 84"></div>@for (s of steps; track s; let i = $index) { <div class="st" [class.done]="i <= o.statusStep"><div class="dot" style="width:32px;height:32px">@if (i <= o.statusStep) { <i class="fa-solid fa-check"></i> }</div>{{s}}</div> }</div></div> }
    @if (!items().length) { <div class="empty">No orders yet. <a routerLink="/books">Browse books</a></div> }</div>`
})
export class MemberOrdersComponent implements OnInit { private api = inject(Api); items = signal<any[]>([]); steps = ['Placed', 'Processing', 'Sent', 'Completed'];
  ngOnInit() { this.api.get('books/my-orders').subscribe(r => this.items.set(r)); } }

/** My Submissions with live status badges, prize, remarks and certificate download. */
@Component({
  selector: 'app-member-submissions', standalone: true, imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `<div class="page container"><div class="title"><h1>My Submissions</h1></div>
    <div class="grid g2">@for (s of items(); track s.submissionId) { <div class="card"><div class="row between"><h4 style="margin:0">{{s.recipeTitle}}</h4><span [class]="'badge ' + s.status">{{s.status}}</span></div>
      <img [src]="api.img(s.imagePath)" [alt]="s.recipeTitle" style="width:100%;height:160px;object-fit:cover;border-radius:14px;margin:10px 0;background:#fff"><p class="muted" style="margin:0">Submitted {{s.submittedAt | date:'mediumDate'}}</p>
      @if (s.status === 'Selected') { <p><i class="fa-solid fa-trophy" style="color:var(--primary);margin-right:6px"></i> Prize money: <b>{{s.prizeAmount | currency}}</b></p><button class="btn sm" (click)="cert(s)"><i class="fa-solid fa-download"></i> Participation Certificate (PDF)</button> }
      @if (s.adminRemarks) { <p class="muted">Admin: {{s.adminRemarks}}</p> }</div> }</div>
    @if (!items().length) { <div class="empty">No submissions yet. <a routerLink="/recipes/submit">Submit your first recipe</a></div> }</div>`
})
export class MemberSubmissionsComponent implements OnInit { api = inject(Api); items = signal<any[]>([]);
  ngOnInit() { this.api.get('recipes/my-submissions').subscribe(r => this.items.set(r)); }
  cert(s: any) { this.api.download(`recipes/submissions/${s.submissionId}/certificate`, `${s.certificateNumber}.pdf`); } }
