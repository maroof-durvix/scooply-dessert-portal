import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

/** Contact Us: contact details, branches with map links, and a working contact form. */
@Component({
  selector: 'app-contact', standalone: true, imports: [FormsModule],
  template: `<div class="page container"><div class="title"><h1>Get in <em>touch</em></h1><p class="muted">Questions about a recipe, an order or the contest? We usually reply within a day.</p></div>
    @if (s(); as s) {
      <div class="grid g4 mb center">
        <div class="card hover contact-card" data-aos="fade-up">
          <div class="pro-icon-box">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <h4>Address</h4>
          <p class="muted">{{s.site.address}}</p>
        </div>

        <div class="card hover contact-card" data-aos="fade-up" data-aos-delay="80">
          <div class="pro-icon-box">
            <i class="fa-solid fa-phone"></i>
          </div>
          <h4>Phone</h4>
          <p class="muted">{{s.site.phone}}</p>
        </div>

        <div class="card hover contact-card" data-aos="fade-up" data-aos-delay="160">
          <div class="pro-icon-box">
            <i class="fa-solid fa-envelope"></i>
          </div>
          <h4>Email</h4>
          <p class="muted">{{s.site.email}}</p>
        </div>

        <div class="card hover contact-card" data-aos="fade-up" data-aos-delay="240">
          <div class="pro-icon-box">
            <i class="fa-solid fa-clock"></i>
          </div>
          <h4>Hours</h4>
          <p class="muted">{{s.site.workingHours}}</p>
        </div>
      </div>
    }

    <div class="grid g2">
      <form class="card" (ngSubmit)="send()" novalidate [class.shake]="shake()">
        <h3 style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <i class="fa-solid fa-paper-plane" style="color:var(--primary)"></i>
          <span>Send us a message</span>
        </h3>
        <div class="field" [class.invalid]="e('name')"><input id="n" [(ngModel)]="m.name" name="n" placeholder=" "><label for="n">Name</label>@if (e('name')) { <span class="err">{{e('name')}}</span> }</div>
        <div class="field" [class.invalid]="e('email')"><input id="m" type="email" [(ngModel)]="m.email" name="m" placeholder=" "><label for="m">Email</label>@if (e('email')) { <span class="err">{{e('email')}}</span> }</div>
        <div class="field" [class.invalid]="e('subject')"><input id="s" [(ngModel)]="m.subject" name="s" placeholder=" "><label for="s">Subject</label>@if (e('subject')) { <span class="err">{{e('subject')}}</span> }</div>
        <div class="field" [class.invalid]="e('message')"><textarea id="g" [(ngModel)]="m.message" name="g" placeholder=" "></textarea><label for="g">Message</label>@if (e('message')) { <span class="err">{{e('message')}}</span> }</div>
        <button class="btn" [disabled]="busy()"><i class="fa-solid fa-paper-plane" style="margin-right:6px"></i>@if (busy()) { <span class="spinner"></span> } Send Message</button>
      </form>

      <div>
        <h3 style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <i class="fa-solid fa-store" style="color:var(--primary)"></i>
          <span>Our Branches</span>
        </h3>
        @for (b of s()?.branches ?? []; track b.branchId; let i = $index) {
          <div class="card mb branch-item-card" data-aos="fade-up" [attr.data-aos-delay]="i * 80">
            <div class="branch-card-header">
              <div class="pro-icon-box sm">
                <i class="fa-solid fa-store"></i>
              </div>
              <div style="flex:1">
                <h4>{{b.name}}</h4>
                <div class="branch-meta">
                  <span><i class="fa-solid fa-location-dot"></i> {{b.address}}</span>
                  <span><i class="fa-solid fa-phone"></i> {{b.phone}}</span>
                </div>
              </div>
            </div>
            <div style="margin-top:10px">
              @if (b.mapEmbedUrl) {
                <a class="btn sm ghost" [href]="b.mapEmbedUrl" target="_blank" rel="noopener">
                  <i class="fa-solid fa-map-location-dot" style="margin-right:6px"></i> View on map
                </a>
              }
              @else {
                <a class="btn sm ghost" [href]="'https://www.google.com/maps/search/' + encode(b.address)" target="_blank" rel="noopener">
                  <i class="fa-solid fa-map-location-dot" style="margin-right:6px"></i> Open in Maps
                </a>
              }
            </div>
          </div>
        }
      </div>
    </div>
  </div>`
})
export class ContactComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService);
  s = signal<any>(null); m = { name: '', email: '', subject: '', message: '' }; busy = signal(false); shake = signal(false); private tried = false;
  ngOnInit() { this.api.get('public/site').subscribe(s => this.s.set(s)); }
  encode(v: string) { return encodeURIComponent(v); }
  e(k: string) { if (!this.tried) return ''; const m = this.m;
    return ({ name: m.name.trim().length < 2 ? 'Enter your name.' : '', email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) ? 'Enter a valid email.' : '',
      subject: m.subject.trim().length < 3 ? 'Subject is required.' : '', message: m.message.trim().length < 10 ? 'Message must be at least 10 characters.' : '' } as any)[k]; }
  send() {
    this.tried = true; if (['name', 'email', 'subject', 'message'].some(k => this.e(k))) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    this.busy.set(true);
    this.api.post('public/contact', this.m).subscribe({ next: (r: any) => { this.busy.set(false); this.toast.success(r.message); this.m = { name: '', email: '', subject: '', message: '' }; this.tried = false; },
      error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } });
  }
}
