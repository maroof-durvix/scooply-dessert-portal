import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errMsg, fieldErrors } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CardFormComponent } from '../../shared/card-form.component';
import { confetti, passwordScore } from '../../core/util';
import { NoDigitsDirective } from '../../core/directives';

/** 4-step registration wizard. The account is created ONLY after the membership payment succeeds. */
@Component({
  selector: 'app-register', standalone: true, imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, CardFormComponent, NoDigitsDirective],
  template: `<div class="page container" style="max-width:860px"><div class="title"><h1>Join <em>Scooply</em></h1><p class="muted">Pick a plan, create your account and start scooping.</p></div>
    <div class="stepper" style="margin:0 0 28px"><div class="bar" [style.width.%]="(step() - 1) * 28"></div>
      @for (s of ['Plan', 'Account', 'Payment', 'Done']; track s; let i = $index) { <div class="st" [class.done]="i < step()"><div class="dot">{{i + 1}}</div>{{s}}</div> }</div>

    @if (step() === 1) {
      <div class="grid g3">@for (p of plans(); track p.planId) { <button type="button" class="card hover center" (click)="plan.set(p)" style="cursor:pointer;font:inherit;color:inherit" [style.border-color]="plan()?.planId === p.planId ? 'var(--primary)' : ''" [style.transform]="plan()?.planId === p.planId ? 'scale(1.03)' : ''">
        @if (p.durationDays >= 365 && monthlyPrice() > 0) { <span class="badge" style="background:var(--accent);color:var(--text);font-weight:700">Save {{(monthlyPrice() * 12 - p.price) | currency}}</span> }
        <h3>{{p.name}}</h3><div style="font:300 2.8rem var(--font-serif);letter-spacing:-.03em;color:var(--text)">{{p.price === 0 ? 'Free' : (p.price | currency:undefined:'symbol':'1.0-0')}}</div><p class="muted">{{p.durationDays}} days of access</p>
        <span class="badge" [class.member]="plan()?.planId === p.planId">@if (plan()?.planId === p.planId) { <i class="fa-solid fa-check" style="margin-right:4px"></i> Selected } @else { Select }</span></button> }</div>
      <p class="center mt"><button class="btn" [disabled]="!plan()" (click)="step.set(2)">Continue</button></p>
    }

    @if (step() === 2) {
      <form class="card" [class.shake]="shake()" (ngSubmit)="next2()" novalidate>
        <div class="grid g2">
          <div class="field" [class.invalid]="e('fullName')"><input id="fn" [(ngModel)]="f.fullName" name="fn" placeholder=" " autocomplete="name"><label for="fn">Full name</label>@if (e('fullName')) { <span class="err">{{e('fullName')}}</span> }</div>
          <div class="field" [class.invalid]="e('email')"><input id="em" type="email" [(ngModel)]="f.email" name="em" placeholder=" " (blur)="checkEmail()" autocomplete="email"><label for="em">Email</label>@if (e('email')) { <span class="err">{{e('email')}}</span> }</div>
          <div class="field" [class.invalid]="e('username')"><input id="un" noDigits [(ngModel)]="f.username" (ngModelChange)="onUserChange($event)" (keydown)="filterDigits($event)" name="un" placeholder=" " (blur)="checkUser()" autocomplete="username"><label for="un">Username</label>@if (e('username')) { <span class="err">{{e('username')}}</span> }</div>
          <div class="field" [class.invalid]="e('phone')"><input id="ph" [(ngModel)]="f.phone" name="ph" placeholder=" " autocomplete="tel"><label for="ph">Phone</label>@if (e('phone')) { <span class="err">{{e('phone')}}</span> }</div>
          <div><div class="field" [class.invalid]="e('password')"><input id="pw" type="password" [(ngModel)]="f.password" name="pw" placeholder=" " autocomplete="new-password"><label for="pw">Password</label>@if (e('password')) { <span class="err">{{e('password')}}</span> }</div>
            <div class="strength" [class]="'strength s' + score()"><i></i><i></i><i></i><i></i><i></i></div></div>
          <div class="field" [class.invalid]="e('confirm')"><input id="cp" type="password" [(ngModel)]="f.confirmPassword" name="cp" placeholder=" " autocomplete="new-password"><label for="cp">Confirm password</label>@if (e('confirm')) { <span class="err">{{e('confirm')}}</span> }</div></div>
        <div class="field" [class.invalid]="e('address')"><textarea id="ad" [(ngModel)]="f.address" name="ad" placeholder=" " style="min-height:80px"></textarea><label for="ad">Address</label>@if (e('address')) { <span class="err">{{e('address')}}</span> }</div>
        <label class="check"><input type="checkbox" [(ngModel)]="f.acceptTerms" name="tc"><span>I accept the Terms &amp; Conditions.</span></label>@if (e('terms')) { <span class="err">{{e('terms')}}</span> }
        <div class="row"><button type="button" class="btn ghost" (click)="step.set(1)">Back</button><button class="btn" [disabled]="busy()">{{isFree() ? 'Create free account' : 'Continue to payment'}}</button></div></form>
    }

    @if (step() === 3) {
      <form class="card" (ngSubmit)="pay()"><div class="grid g2"><div><app-card-form #card/></div>
        <div class="card" style="background:rgba(var(--accent-rgb), .08);border:1px solid var(--border);box-shadow:none"><h4>Order summary</h4><p>{{plan()?.name}} membership<br><span class="muted">{{plan()?.durationDays}} days</span></p><h2 style="color:var(--primary)">{{plan()?.price | currency}}</h2>
          <p class="muted" style="font-size:.85rem">Your account is created only after the payment succeeds.</p></div></div>
        <div class="row"><button type="button" class="btn ghost" (click)="step.set(2)">Back</button><button class="btn" [disabled]="busy()">@if (busy()) { <span class="spinner"></span> Processing… } @else { Pay {{plan()?.price | currency}} }</button></div></form>
    }

    @if (step() === 4) {
      <div class="card center printable">
        @if (ok()) { <svg class="tick" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M28 52l16 16 28-32"/></svg><h2>Transaction Completed Successfully</h2><p>Welcome to Scooply, {{f.fullName}}!</p>
          <table style="max-width:420px;margin:auto"><tbody><tr><td>Plan</td><td>{{receipt().plan}}</td></tr><tr><td>Amount</td><td>{{receipt().amount | currency}}</td></tr>@if (receipt().cardLast4) { <tr><td>Card</td><td>•••• {{receipt().cardLast4}}</td></tr> }
            <tr><td>Valid</td><td>{{receipt().startDate | date:'mediumDate'}} – {{receipt().endDate | date:'mediumDate'}}</td></tr><tr><td>Transaction</td><td style="font-size:.75rem">{{receipt().transactionRef}}</td></tr></tbody></table>
          <div class="row mt" style="justify-content:center"><a class="btn" routerLink="/member/dashboard">Go to dashboard</a><button class="btn ghost" (click)="print()">Print receipt</button></div>
        } @else { <svg class="tick bad" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M32 32l36 36M68 32L32 68"/></svg><h2>Transaction Failed</h2><p class="muted">{{failMsg()}}</p><p>No account was created.</p>
          <button class="btn" (click)="step.set(3)">Try again</button> }
      </div>
    }
  </div>`
})
export class RegisterComponent implements OnInit {
  private api = inject(Api); private auth = inject(Auth); private route = inject(ActivatedRoute); private router = inject(Router); private toast = inject(ToastService);
  @ViewChild('card') card?: CardFormComponent;
  step = signal(1); plans = signal<any[]>([]); plan = signal<any>(null); busy = signal(false); ok = signal(false); shake = signal(false); failMsg = signal(''); receipt = signal<any>({});
  f = { fullName: '', email: '', username: '', phone: '', password: '', confirmPassword: '', address: '', acceptTerms: false };
  private tried = false; private taken: Record<string, string> = {};

  ngOnInit() {
    this.api.get('public/plans').subscribe(p => { this.plans.set(p); const id = +(this.route.snapshot.queryParamMap.get('plan') ?? 0); if (id) this.plan.set(p.find((x: any) => x.planId === id) ?? null); });
  }
  score() { return passwordScore(this.f.password); }
  isFree() { return this.plan()?.price === 0; }
  /** Price of the paid 30-day plan, used to compute the yearly saving. */
  monthlyPrice() { return this.plans().find(x => x.price > 0 && x.durationDays < 365)?.price ?? 0; }
  /** Async uniqueness checks (email / username). */
  checkEmail() { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.f.email)) return; this.api.get('auth/check-email', { email: this.f.email }).subscribe((r: any) => this.taken['email'] = r.available ? '' : 'This email is already registered.'); }
  checkUser() {
    if (/\d/.test(this.f.username)) { this.taken['username'] = 'Numbers are not allowed in username.'; return; }
    if (this.f.username.length < 4) return;
    this.api.get('auth/check-username', { username: this.f.username }).subscribe((r: any) => this.taken['username'] = r.available ? '' : (r.error || 'This username is taken.'));
  }
  filterDigits(e: KeyboardEvent) {
    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
    }
  }
  onUserChange(val: string) {
    this.f.username = (val || '').replace(/\d/g, '');
  }
  e(k: string) {
    if (this.taken[k]) return this.taken[k]; if (!this.tried) return ''; const f = this.f;
    return ({ fullName: f.fullName.trim().length < 3 ? 'Enter your full name.' : '', email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? 'Enter a valid email.' : '',
      username: /\d/.test(f.username) ? 'Numbers are not allowed in username.' : !/^[A-Za-z_.]{4,40}$/.test(f.username) ? 'Username: 4–40 letters, _ or . (no numbers).' : '', phone: !/^\+?\d{10,15}$/.test(f.phone) ? 'Phone: 10–15 digits, + allowed.' : '',
      password: this.score() < 5 ? 'Min 8 chars with upper, lower, digit and symbol.' : '', confirm: f.confirmPassword !== f.password ? 'Passwords do not match.' : '',
      address: f.address.trim().length < 10 ? 'Address must be at least 10 characters.' : '', terms: !f.acceptTerms ? 'You must accept the terms.' : '' } as any)[k];
  }
  next2() {
    this.tried = true;
    if (['fullName', 'email', 'username', 'phone', 'password', 'confirm', 'address', 'terms'].some(k => this.e(k))) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    if (this.isFree()) { this.pay(); return; }   // free plan: no card step
    this.step.set(3);
  }
  print() { window.print(); }
  pay() {
    const free = this.isFree();
    if (!free && !this.card!.validate()) return;
    this.busy.set(true);
    this.api.post('auth/register', { planId: this.plan().planId, ...this.f, card: free ? null : this.card!.value() }).subscribe({
      next: (r: any) => { this.busy.set(false); this.auth.set(r.auth, false); this.receipt.set(r.receipt); this.ok.set(true); this.step.set(4); confetti();
        setTimeout(() => { if (this.router.url.startsWith('/account/register')) this.router.navigateByUrl('/member/dashboard'); }, 12000); },
      error: err => { this.busy.set(false);
        if (err.status === 402) { this.failMsg.set(err.error.reason ?? 'Payment declined.'); this.ok.set(false); this.step.set(4); this.toast.error('Transaction Failed'); }
        else if (err.status === 409) { this.toast.error(errMsg(err)); this.step.set(2); }
        else if (err.status === 400 && err.error?.errors) { const fe = fieldErrors(err); this.card?.setServerErrors(fe); this.toast.error(errMsg(err)); if (fe['password'] || fe['email']) this.step.set(2); }
        else this.toast.error(errMsg(err)); } });
  }
}
