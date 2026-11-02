import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StarsComponent } from '../shared/stars.component';
import { PagerComponent } from './pager.component';
import { CustomSelectComponent } from '../shared/custom-select.component';
import { CustomDatePickerComponent } from '../shared/custom-date-picker.component';

/** Feedback list (R20): stars, user type, mark read, feature on Home, delete, filter by rating/date. */
@Component({
  selector: 'app-admin-feedback', standalone: true, imports: [FormsModule, DatePipe, StarsComponent, PagerComponent, CustomSelectComponent, CustomDatePickerComponent],
  template: `<h2>Feedback</h2>
    <div class="row mb" style="position:relative;z-index:100">
      <app-custom-select [(ngModel)]="q.rating" (ngModelChange)="reset()" [options]="ratingOptions" placeholder="All ratings"/>
      <app-date-picker [(ngModel)]="q.from" (ngModelChange)="reset()" placeholder="From date"/>
      <app-date-picker [(ngModel)]="q.to" (ngModelChange)="reset()" placeholder="To date"/>
    </div>
    @for (f of items(); track f.feedbackId) { <div class="card mb" [style.border-left]="f.isRead ? '' : '6px solid var(--primary)'"><div class="row between"><b>{{f.name}} <span class="muted">&lt;{{f.email}}&gt;</span> <span class="badge">{{f.userType}}</span></b><span class="muted">{{f.submittedAt | date:'medium'}}</span></div>
      <app-stars [value]="f.rating" [readonly]="true"/><h4 style="margin:4px 0">{{f.subject}}</h4><p>{{f.message}}</p>
      <div class="row"><button class="btn sm ghost" [disabled]="f.isRead" (click)="read(f)"><i class="fa-solid fa-envelope-open" style="margin-right:6px"></i>Mark read</button><button class="btn sm" [class.alt]="!f.isFeatured" (click)="feature(f)"><i class="fa-solid fa-star" [style.color]="f.isFeatured ? 'var(--primary)' : 'inherit'" style="margin-right:6px"></i>{{f.isFeatured ? 'Featured on Home' : 'Feature on Home'}}</button><button class="btn sm danger" (click)="del(f)"><i class="fa-solid fa-trash-can" style="margin-right:6px"></i>Delete</button></div></div> }
    @if (!items().length) { <div class="empty">No feedback found.</div> }<app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>`
})
export class AdminFeedbackComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService); items = signal<any[]>([]); total = signal(0); page = 1; q: any = { rating: '', from: '', to: '' };
  ratingOptions = [
    { label: 'All ratings', value: '' },
    { label: '5 stars', value: 5 },
    { label: '4 stars', value: 4 },
    { label: '3 stars', value: 3 },
    { label: '2 stars', value: 2 },
    { label: '1 star', value: 1 }
  ];
  ngOnInit() { this.load(); } reset() { this.page = 1; this.load(); }
  load() { this.api.get('admin/feedback', { ...this.q, page: this.page }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
  read(f: any) { this.api.post(`admin/feedback/${f.feedbackId}/read`).subscribe(() => f.isRead = true); }
  feature(f: any) { this.api.post(`admin/feedback/${f.feedbackId}/feature`).subscribe((r: any) => { f.isFeatured = r.isFeatured; this.toast.success(r.isFeatured ? 'Shown on Home' : 'Removed from Home'); }); }
  del(f: any) { if (confirm('Delete this feedback?')) this.api.delete('admin/feedback/' + f.feedbackId).subscribe({ next: () => { this.toast.success('Deleted'); this.load(); }, error: e => this.toast.error(errMsg(e)) }); }
}

/** Contact Us messages. */
@Component({
  selector: 'app-admin-messages', standalone: true, imports: [DatePipe, PagerComponent],
  template: `<h2>Contact Messages</h2>@for (m of items(); track m.id) { <div class="card mb"><div class="row between"><b>{{m.name}} &lt;{{m.email}}&gt;</b><span class="muted">{{m.sentAt | date:'medium'}}</span></div><h4 style="margin:4px 0">{{m.subject}}</h4><p style="margin:0">{{m.message}}</p></div> }
    @if (!items().length) { <div class="empty">No messages.</div> }<app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>`
})
export class AdminMessagesComponent implements OnInit {
  private api = inject(Api); items = signal<any[]>([]); total = signal(0); page = 1; ngOnInit() { this.load(); }
  load() { this.api.get('admin/contact-messages', { page: this.page }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
}

/** New recipe submissions (R21–R23): review, select with prize + show-on-home, reject, revert, certificate PDF. */
@Component({
  selector: 'app-admin-submissions', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe, PagerComponent, CustomSelectComponent],
  template: `<h2>Recipe Submissions</h2>
    <div class="row mb">
      <app-custom-select [(ngModel)]="status" (ngModelChange)="page = 1; load()" [options]="statusOptions" placeholder="Status"/>
    </div>
    @for (s of items(); track s.submissionId) { <div class="card mb"><div class="grid g2" style="grid-template-columns:200px 1fr;align-items:start">
      <img [src]="api.img(s.imagePath)" [alt]="s.recipeTitle" style="width:100%;border-radius:14px;background:#fff">
      <div><div class="row between"><h3 style="margin:0">{{s.recipeTitle}}</h3><span [class]="'badge ' + s.status">{{s.status}}</span></div>
        <p class="muted" style="margin:2px 0">by <b>{{s.userName}}</b> ({{s.email}}) · {{s.submittedAt | date:'medium'}}</p><p>{{s.description}}</p>
        <details><summary>Ingredients &amp; procedure</summary><h4>Ingredients</h4><ul>@for (i of lines(s.ingredients); track $index) { <li>{{i}}</li> }</ul><h4>Procedure</h4><ol>@for (i of lines(s.procedure); track $index) { <li>{{i}}</li> }</ol></details>
        @if (s.status === 'Selected') { <p><i class="fa-solid fa-trophy" style="color:var(--primary);margin-right:6px"></i> Prize <b>{{s.prizeAmount | currency}}</b> · {{s.certificateNumber}} · {{s.showOnHome ? 'Shown on Home (Top Recipe)' : 'Hidden from Home'}}</p> }
        @if (s.adminRemarks) { <p class="muted">Remarks: {{s.adminRemarks}}</p> }
        <div class="row"><button class="btn sm" (click)="open('select', s)">Select winner</button><button class="btn sm danger" (click)="open('reject', s)">Reject</button>
          @if (s.status !== 'Pending') { <button class="btn sm ghost" (click)="revert(s)">Revert to pending</button> }@if (s.status === 'Selected') { <button class="btn sm alt" (click)="cert(s)">Certificate PDF</button> }</div></div></div></div> }
    @if (!items().length) { <div class="empty">No submissions.</div> }<app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>
    @if (dlg(); as d) { <div class="modal-bg" (click)="dlg.set(null)"><form class="modal" style="max-width:480px" (click)="$event.stopPropagation()" (ngSubmit)="confirm()"><h3>{{d.kind === 'select' ? 'Select "' + d.s.recipeTitle + '"' : 'Reject submission'}}</h3>
      @if (d.kind === 'select') { <div class="field"><input id="pz" type="number" min="0" step="0.01" [(ngModel)]="d.prize" name="pz" placeholder=" " required><label for="pz">Prize money ($)</label></div>
        <label class="check"><input type="checkbox" [(ngModel)]="d.showOnHome" name="sh"><span>Show on Home Page (Top Recipe)</span></label> }
      <div class="field"><textarea id="rm" [(ngModel)]="d.remarks" name="rm" placeholder=" " style="min-height:80px"></textarea><label for="rm">Remarks</label></div>
      <div class="row"><button class="btn" [class.danger]="d.kind === 'reject'">Confirm</button><button type="button" class="btn ghost" (click)="dlg.set(null)">Cancel</button></div></form></div> }`
})
export class AdminSubmissionsComponent implements OnInit {
  api = inject(Api); private toast = inject(ToastService); items = signal<any[]>([]); total = signal(0); page = 1; status = 'Pending'; dlg = signal<any>(null);
  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Selected', value: 'Selected' },
    { label: 'Rejected', value: 'Rejected' }
  ];
  ngOnInit() { this.load(); }
  lines(t: string) { return (t || '').split('\n').filter(x => x.trim()); }
  load() { this.api.get('admin/submissions', { status: this.status, page: this.page }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
  open(kind: string, s: any) { this.dlg.set({ kind, s, prize: s.prizeAmount ?? 100, showOnHome: true, remarks: s.adminRemarks ?? '' }); }
  confirm() { const d = this.dlg(); const id = d.s.submissionId;
    const call = d.kind === 'select' ? this.api.post(`admin/submissions/${id}/select`, { prizeAmount: +d.prize, remarks: d.remarks, showOnHome: d.showOnHome }) : this.api.post(`admin/submissions/${id}/reject`, { remarks: d.remarks });
    call.subscribe({ next: (r: any) => { this.toast.success(r.message); this.dlg.set(null); this.load(); }, error: e => this.toast.error(errMsg(e)) }); }
  revert(s: any) { this.api.post(`admin/submissions/${s.submissionId}/pending`).subscribe(() => { this.toast.info('Reverted to pending'); this.load(); }); }
  cert(s: any) { this.api.download(`admin/submissions/${s.submissionId}/certificate`, `${s.certificateNumber}.pdf`); }
}
