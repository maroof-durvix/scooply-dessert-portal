import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { NoDigitsDirective } from '../../core/directives';

/** Member login with username + password, remember me and show/hide password. */
@Component({
  selector: 'app-login', standalone: true, imports: [FormsModule, RouterLink, NoDigitsDirective],
  template: `<div class="auth">
    <div class="auth-main">
    <div class="auth-head"><span class="eyebrow">Members</span><h1>Welcome <em>back.</em></h1><p class="muted">Log in to unlock every recipe, track your orders and enter the contest.</p></div>
    <form class="auth-form" [class.shake]="shake()" (ngSubmit)="go()" novalidate>
      @if (error()) { <div class="err" role="alert" style="margin:0 0 14px">{{error()}}</div> }
      <div class="field" [class.invalid]="(tried && !m.username) || numErr()"><input id="u" noDigits [(ngModel)]="m.username" (ngModelChange)="onUserChange($event)" (keydown)="filterDigits($event)" name="u" placeholder=" " autocomplete="username"><label for="u">Username</label>@if (numErr()) { <span class="err">Numbers are not allowed in username.</span> } @else if (tried && !m.username) { <span class="err">Username is required.</span> }</div>
      <div class="field" [class.invalid]="tried && !m.password"><input id="p" [type]="show() ? 'text' : 'password'" [(ngModel)]="m.password" name="p" placeholder=" " autocomplete="current-password"><label for="p">Password</label>
        <button type="button" (click)="show.set(!show())" aria-label="Show or hide password" style="position:absolute;right:12px;top:16px;background:none;border:0;cursor:pointer;color:var(--muted)"><i class="fa-solid" [class.fa-eye]="!show()" [class.fa-eye-slash]="show()"></i></button>
        @if (tried && !m.password) { <span class="err">Password is required.</span> }</div>
      <label class="check"><input type="checkbox" [(ngModel)]="m.rememberMe" name="r"><span>Remember me</span></label>
      <button class="btn lg block" [disabled]="busy()">@if (busy()) { <span class="spinner"></span> } Log in <i class="fa-solid fa-arrow-right"></i></button>
      <div class="auth-links"><a routerLink="/account/forgot-password">Forgot password?</a><span>New here? <a routerLink="/account/register">Create an account</a></span></div></form>
    </div>
    <aside class="auth-art" aria-hidden="true">
      <div class="auth-arch"><img src="/images/flavors/strawberry.jpg" alt=""></div>
      <p class="auth-quote">“Every scoop should taste like the first one I ever sold.”<small>— Mr. A, founder</small></p>
    </aside>
  </div>`
})
export class LoginComponent {
  private auth = inject(Auth); private router = inject(Router); private route = inject(ActivatedRoute);
  m = { username: '', password: '', rememberMe: false }; tried = false; busy = signal(false); error = signal(''); show = signal(false); shake = signal(false); numErr = signal(false);

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
    this.tried = true; this.error.set('');
    if (/\d/.test(this.m.username)) {
      this.numErr.set(true);
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), 500);
      return;
    }
    if (!this.m.username || !this.m.password) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    this.busy.set(true);
    this.auth.login(this.m).subscribe({ next: () => { this.busy.set(false); this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/member/dashboard'); },
      error: e => { this.busy.set(false); this.error.set(errMsg(e)); this.shake.set(true); setTimeout(() => this.shake.set(false), 500); } });
  }
}
