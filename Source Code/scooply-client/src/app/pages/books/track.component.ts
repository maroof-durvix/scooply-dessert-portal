import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../../core/api.service';

/** Order tracking with an animated Placed → Processing → Sent → Completed stepper. */
@Component({
  selector: 'app-track', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe],
  template: `<div class="page container" style="max-width:760px"><div class="title"><h1>Track Your Order</h1></div>
    <form class="card" (ngSubmit)="go()"><div class="grid g2"><div class="field"><input id="o" [(ngModel)]="no" name="o" placeholder=" " required><label for="o">Order number (SCP-2026-000001)</label></div>
      <div class="field"><input id="e" type="email" [(ngModel)]="email" name="e" placeholder=" " required><label for="e">Email used for the order</label></div></div>
      <button class="btn" [disabled]="busy()"><i class="fa-solid fa-magnifying-glass" style="margin-right:6px"></i>@if (busy()) { <span class="spinner"></span> } Track Order</button></form>
    @if (msg()) { <p class="err" style="margin:16px 0">{{msg()}}</p> }
    @if (o(); as o) { <div class="card mt"><div class="row between"><h3 style="margin:0">{{o.orderNumber}}</h3><span class="badge" [class]="'badge ' + o.status">{{o.status}}</span></div>
      <p class="muted">{{o.bookTitle}} × {{o.quantity}} · {{o.totalCost | currency}} · ordered {{o.orderedAt | date:'medium'}}</p>
      <div class="stepper"><div class="bar" [style.width.%]="progress()"></div>
        @for (s of steps; track s; let i = $index) { <div class="st" [class.done]="i <= (o.statusStep)"><div class="dot">@if (i <= o.statusStep) { <i class="fa-solid fa-check"></i> } @else { {{i + 1}} }</div>{{s}}</div> }</div>
      <p class="muted">Last updated {{o.statusUpdatedAt | date:'medium'}}</p></div> }
  </div>`
})
export class TrackComponent {
  private api = inject(Api); no = ''; email = ''; o = signal<any>(null); msg = signal(''); busy = signal(false); progress = signal(0);
  steps = ['Placed', 'Processing', 'Sent', 'Completed'];
  go() {
    this.busy.set(true); this.msg.set(''); this.o.set(null); this.progress.set(0);
    this.api.get('books/track', { orderNumber: this.no, email: this.email }).subscribe({
      next: o => { this.busy.set(false); this.o.set(o); setTimeout(() => this.progress.set(o.statusStep / 3 * 84), 80); },   // animate bar fill
      error: e => { this.busy.set(false); this.msg.set(errMsg(e)); } });
  }
}
