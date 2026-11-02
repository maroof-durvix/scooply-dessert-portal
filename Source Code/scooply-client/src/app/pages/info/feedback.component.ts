import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { StarsComponent } from '../../shared/stars.component';

/** Feedback form for guests and members (members get name/email pre-filled). */
@Component({
  selector: 'app-feedback', standalone: true, imports: [FormsModule, StarsComponent],
  template: `<div class="page container" style="max-width:720px"><div class="title"><h1>Feedback</h1><p class="muted">Tell us how we're doing.</p></div>
    @if (done()) { <div class="card center"><svg class="tick" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M28 52l16 16 28-32"/></svg><h3>Thank you for your feedback!</h3><button class="btn ghost" (click)="done.set(false)">Send another</button></div> }
    @else { <form class="card" [class.shake]="shake()" (ngSubmit)="send()" novalidate>
      <div class="grid g2"><div class="field" [class.invalid]="e('name')"><input id="n" [(ngModel)]="m.name" name="n" placeholder=" "><label for="n">Name</label>@if (e('name')) { <span class="err">{{e('name')}}</span> }</div>
        <div class="field" [class.invalid]="e('email')"><input id="m" type="email" [(ngModel)]="m.email" name="m" placeholder=" "><label for="m">Email</label>@if (e('email')) { <span class="err">{{e('email')}}</span> }</div></div>
      <div class="mb"><b>Rating</b><br><app-stars [(value)]="m.rating"/>@if (e('rating')) { <span class="err" style="margin:0">{{e('rating')}}</span> }</div>
      <div class="field" [class.invalid]="e('subject')"><input id="s" [(ngModel)]="m.subject" name="s" placeholder=" "><label for="s">Subject</label>@if (e('subject')) { <span class="err">{{e('subject')}}</span> }</div>
      <div class="field" [class.invalid]="e('message')"><textarea id="g" [(ngModel)]="m.message" name="g" placeholder=" "></textarea><label for="g">Message</label>@if (e('message')) { <span class="err">{{e('message')}}</span> }</div>
      <button class="btn" [disabled]="busy()">@if (busy()) { <span class="spinner"></span> } Send feedback</button></form> }</div>`
})
export class FeedbackComponent implements OnInit {
  private api = inject(Api); private auth = inject(Auth); private toast = inject(ToastService);
  m = { name: '', email: '', rating: 0, subject: '', message: '' }; done = signal(false); busy = signal(false); shake = signal(false); private tried = false;
  ngOnInit() { if (this.auth.isMember()) this.api.get('auth/me').subscribe(u => { this.m.name = u.fullName; this.m.email = u.email; }); }
  e(k: string) {
    if (!this.tried) return ''; const m = this.m;
    return ({ name: m.name.trim().length < 2 ? 'Enter your name.' : '', email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) ? 'Enter a valid email.' : '',
      rating: m.rating < 1 ? 'Please choose a rating.' : '', subject: m.subject.trim().length < 3 ? 'Subject is required.' : '',
      message: m.message.trim().length < 10 ? 'Message must be at least 10 characters.' : '' } as any)[k];
  }
  send() {
    this.tried = true;
    if (['name', 'email', 'rating', 'subject', 'message'].some(k => this.e(k))) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    this.busy.set(true);
    this.api.post('feedback', this.m).subscribe({ next: () => { this.busy.set(false); this.done.set(true); this.m = { ...this.m, rating: 0, subject: '', message: '' }; this.tried = false; },
      error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } });
  }
}
