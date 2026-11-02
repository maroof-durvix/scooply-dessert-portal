import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { passwordScore } from '../../core/util';

/** Forgot password: the email is simulated, so the reset link is shown on screen (Development API) and logged. */
@Component({
  selector: 'app-forgot', standalone: true, imports: [FormsModule, RouterLink],
  template: `<div class="page container" style="max-width:440px"><div class="title"><h1>Forgot password</h1></div>
    <form class="card" (ngSubmit)="send()"><div class="field"><input id="e" type="email" [(ngModel)]="email" name="e" placeholder=" " required><label for="e">Your email</label></div>
      <button class="btn" style="width:100%" [disabled]="busy()">Send reset link</button>
      @if (msg()) { <p class="mt">{{msg()}}</p> } @if (link()) { <p class="muted" style="font-size:.85rem">Demo mode — email is simulated:<br><a [href]="link()">Open reset link</a></p> }
      <p class="center"><a routerLink="/account/login">Back to login</a></p></form></div>`
})
export class ForgotComponent {
  private api = inject(Api); private toast = inject(ToastService); email = ''; busy = signal(false); msg = signal(''); link = signal('');
  send() { this.busy.set(true);
    this.api.post('auth/forgot-password', { email: this.email }).subscribe({ next: (r: any) => { this.busy.set(false); this.msg.set(r.message); this.link.set(r.resetLink ?? ''); },
      error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } }); }
}

/** Reset password using the emailed token. */
@Component({
  selector: 'app-reset', standalone: true, imports: [FormsModule],
  template: `<div class="page container" style="max-width:440px"><div class="title"><h1>Reset password</h1></div>
    <form class="card" (ngSubmit)="save()"><div class="field"><input id="p" type="password" [(ngModel)]="pw" name="p" placeholder=" " required><label for="p">New password</label></div>
      <div class="strength" [class]="'strength s' + score()"><i></i><i></i><i></i><i></i><i></i></div><p class="muted" style="font-size:.8rem">8+ characters with upper, lower, digit and symbol.</p>
      <button class="btn" style="width:100%" [disabled]="busy() || score() < 5">Update password</button></form></div>`
})
export class ResetComponent {
  private api = inject(Api); private route = inject(ActivatedRoute); private router = inject(Router); private toast = inject(ToastService);
  pw = ''; busy = signal(false); score() { return passwordScore(this.pw); }
  save() { const q = this.route.snapshot.queryParamMap; this.busy.set(true);
    this.api.post('auth/reset-password', { email: q.get('email'), token: q.get('token'), newPassword: this.pw }).subscribe({
      next: (r: any) => { this.toast.success(r.message); this.router.navigateByUrl('/account/login'); }, error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } }); }
}
