import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { PagerComponent } from './pager.component';
import { CustomSelectComponent } from '../shared/custom-select.component';
import { CustomDatePickerComponent } from '../shared/custom-date-picker.component';

/** Registered users + payment details (R18): filters, sort, pagination, CSV export, detail modal, activate/deactivate. */
@Component({
  selector: 'app-admin-members', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe, PagerComponent, CustomSelectComponent, CustomDatePickerComponent],
  template: `<div class="row between mb"><h2 style="margin:0">Registered Members &amp; Payments</h2><button class="btn alt" (click)="export()"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div>
    <div class="row mb" style="position:relative;z-index:100"><div class="search-box" style="min-width:270px"><i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i><input aria-label="Search" [(ngModel)]="q.search" placeholder="Search name / username / email" (ngModelChange)="reset()"></div>
      <app-custom-select [(ngModel)]="q.plan" (ngModelChange)="reset()" [options]="planOptions" placeholder="All plans"/>
      <app-custom-select [(ngModel)]="q.status" (ngModelChange)="reset()" [options]="statusOptions" placeholder="Any status"/>
      <app-date-picker [(ngModel)]="q.from" (ngModelChange)="reset()" placeholder="From date"/>
      <app-date-picker [(ngModel)]="q.to" (ngModelChange)="reset()" placeholder="To date"/>
      <app-custom-select [(ngModel)]="q.sort" (ngModelChange)="reset()" [options]="sortOptions" placeholder="Sort by"/></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Plan</th><th>Start</th><th>End</th><th>Status</th><th>Amount</th><th>Card</th><th>Paid</th><th></th></tr></thead><tbody>
      @for (r of items(); track r.userId) { <tr><td>{{r.fullName}}</td><td>{{r.username}}</td><td>{{r.email}}</td><td>{{r.phone}}</td><td>{{r.plan}}</td><td>{{r.startDate | date:'shortDate'}}</td><td>{{r.endDate | date:'shortDate'}}</td>
        <td><span class="badge" [class]="'badge ' + (!r.isActive ? 'Failed' : isActive(r) ? 'Completed' : 'Expired')">{{!r.isActive ? 'Deactivated' : isActive(r) ? 'Active' : 'Expired'}}</span></td>
        <td>{{r.amount | currency}}</td><td>{{r.cardType}} ••{{r.cardLast4}}</td><td>{{r.paidAt | date:'short'}}</td>
        <td class="row"><button class="btn sm ghost" (click)="view.set(r)">View</button><button class="btn sm" [class.danger]="r.isActive" (click)="toggle(r)">{{r.isActive ? 'Deactivate' : 'Activate'}}</button></td></tr> }</tbody></table></div>
    <app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>
    @if (view(); as v) { <div class="modal-bg" (click)="view.set(null)"><div class="modal" (click)="$event.stopPropagation()"><h3>{{v.fullName}}</h3>
      <table><tbody><tr><td>Username</td><td>{{v.username}}</td></tr><tr><td>Email</td><td>{{v.email}}</td></tr><tr><td>Phone</td><td>{{v.phone}}</td></tr><tr><td>Joined</td><td>{{v.joinedAt | date:'medium'}}</td></tr>
      <tr><td>Plan</td><td>{{v.plan}} ({{v.startDate | date:'mediumDate'}} – {{v.endDate | date:'mediumDate'}})</td></tr><tr><td>Payment</td><td>{{v.amount | currency}} · {{v.cardType}} ••••{{v.cardLast4}} · <span [class]="'badge ' + v.paymentStatus">{{v.paymentStatus}}</span></td></tr>
      <tr><td>Transaction</td><td style="font-size:.75rem">{{v.transactionRef}}</td></tr></tbody></table><button class="btn mt" (click)="view.set(null)">Close</button></div></div> }`
})
export class AdminMembersComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService);
  items = signal<any[]>([]); total = signal(0); page = 1; view = signal<any>(null); q: any = { search: '', plan: '', status: '', from: '', to: '', sort: 'joined' };
  planOptions = [{ label: 'All plans', value: '' }, { label: 'Monthly', value: 'Monthly' }, { label: 'Yearly', value: 'Yearly' }];
  statusOptions = [{ label: 'Any status', value: '' }, { label: 'Active', value: 'active' }, { label: 'Expired', value: 'expired' }];
  sortOptions = [{ label: 'Newest', value: 'joined' }, { label: 'Name', value: 'name' }, { label: 'Expiry', value: 'end' }];
  ngOnInit() { this.load(); }
  isActive(r: any) { return r.endDate && new Date(r.endDate) >= new Date(); }
  reset() { this.page = 1; this.load(); }
  load() { this.api.get('admin/members', { ...this.q, page: this.page, pageSize: 10 }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
  export() { this.api.download('admin/members/export', 'members.csv', this.q); }
  toggle(r: any) { this.api.post(`admin/members/${r.userId}/toggle`).subscribe({ next: (x: any) => { r.isActive = x.isActive; this.toast.success(x.isActive ? 'User activated' : 'User deactivated'); }, error: e => this.toast.error(errMsg(e)) }); }
}

/** Payments report with filters, revenue total and CSV export. */
@Component({
  selector: 'app-admin-payments', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe, PagerComponent, CustomSelectComponent, CustomDatePickerComponent],
  template: `<div class="row between mb"><h2 style="margin:0">Payments Report</h2><button class="btn alt" (click)="export()">Export CSV</button></div>
    <div class="row mb" style="position:relative;z-index:100">
      <app-custom-select [(ngModel)]="q.type" (ngModelChange)="reset()" [options]="typeOptions" placeholder="All types"/>
      <app-custom-select [(ngModel)]="q.status" (ngModelChange)="reset()" [options]="statusOptions" placeholder="Any status"/>
      <app-date-picker [(ngModel)]="q.from" (ngModelChange)="reset()" placeholder="From date"/>
      <app-date-picker [(ngModel)]="q.to" (ngModelChange)="reset()" placeholder="To date"/>
      <b>Successful revenue: {{revenue() | currency}}</b>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Card</th><th>Holder</th><th>Status</th><th>Reason</th><th>Reference</th></tr></thead><tbody>
      @for (p of items(); track p.paymentId) { <tr><td>{{p.paidAt | date:'short'}}</td><td>{{p.type}}</td><td>{{p.amount | currency}}</td><td>{{p.cardType}} ••{{p.cardLast4}}</td><td>{{p.cardHolderName}}</td><td><span [class]="'badge ' + p.status">{{p.status}}</span></td><td>{{p.failureReason}}</td><td style="font-size:.7rem">{{p.transactionRef}}</td></tr> }</tbody></table></div>
    <app-pager [page]="page" [total]="total()" [pageSize]="15" (pageChange)="page = $event; load()"/>`
})
export class AdminPaymentsComponent implements OnInit {
  private api = inject(Api); items = signal<any[]>([]); total = signal(0); revenue = signal(0); page = 1; q: any = { type: '', status: '', from: '', to: '' };
  typeOptions = [{ label: 'All types', value: '' }, { label: 'Membership', value: 'Membership' }, { label: 'Book order', value: 'BookOrder' }];
  statusOptions = [{ label: 'Any status', value: '' }, { label: 'Success', value: 'Success' }, { label: 'Failed', value: 'Failed' }];
  ngOnInit() { this.load(); } reset() { this.page = 1; this.load(); }
  load() { this.api.get('admin/payments', { ...this.q, page: this.page }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); this.revenue.set(r.revenue); }); }
  export() { this.api.download('admin/payments/export', 'payments.csv', this.q); }
}

/** Book orders (R19): forward-only status updates (Placed → Processing → Sent → Completed), details, invoice, export. */
@Component({
  selector: 'app-admin-orders', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe, PagerComponent, CustomSelectComponent, CustomDatePickerComponent],
  template: `<div class="row between mb"><h2 style="margin:0">Book Orders</h2><button class="btn alt" (click)="export()">Export CSV</button></div>
    <div class="row mb" style="position:relative;z-index:100"><div class="search-box" style="min-width:270px"><i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i><input aria-label="Search" [(ngModel)]="q.search" (ngModelChange)="reset()" placeholder="Search order / name / email"></div>
      <app-custom-select [(ngModel)]="q.status" (ngModelChange)="reset()" [options]="statusOptions" placeholder="All statuses"/>
      <app-date-picker [(ngModel)]="q.from" (ngModelChange)="reset()" placeholder="From date"/>
      <app-date-picker [(ngModel)]="q.to" (ngModelChange)="reset()" placeholder="To date"/></div>
    <div class="table-wrap"><table><thead><tr><th>Order #</th><th>Customer</th><th>Book</th><th>Qty</th><th>Cost</th><th>Payment</th><th>Date</th><th>Status</th><th>Update</th></tr></thead><tbody>
      @for (o of items(); track o.orderId) { <tr><td><a href="javascript:void(0)" (click)="view.set(o)">{{o.orderNumber}}</a></td><td>{{o.customerName}}<br><span class="muted" style="font-size:.75rem">{{o.email}}</span></td><td>{{o.bookTitle}}</td><td>{{o.quantity}}</td><td>{{o.totalCost | currency}}</td>
        <td><span [class]="'badge ' + o.paymentStatus">{{o.paymentStatus}}</span></td><td>{{o.orderedAt | date:'short'}}</td><td><span [class]="'badge ' + o.status">{{o.status}}</span></td>
        <td>@if (o.statusStep < 3) { <button class="btn sm" (click)="advance(o)">→ {{steps[o.statusStep + 1]}}</button> } @else { <span class="muted">Done</span> }</td></tr> }</tbody></table></div>
    <app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>
    @if (view(); as v) { <div class="modal-bg" (click)="view.set(null)"><div class="modal printable" (click)="$event.stopPropagation()"><h3>Invoice {{v.orderNumber}}</h3>
      <table><tbody><tr><td>Customer</td><td>{{v.customerName}}</td></tr><tr><td>Email / phone</td><td>{{v.email}} · {{v.contactNumber}}</td></tr><tr><td>Address</td><td>{{v.address}}</td></tr><tr><td>Book</td><td>{{v.bookTitle}} × {{v.quantity}}</td></tr>
      <tr><td>Total</td><td><b>{{v.totalCost | currency}}</b> (card ••{{v.cardLast4}})</td></tr><tr><td>Ordered</td><td>{{v.orderedAt | date:'medium'}}</td></tr><tr><td>Status</td><td>{{v.status}} (updated {{v.statusUpdatedAt | date:'medium'}})</td></tr></tbody></table>
      <div class="row mt"><button class="btn" (click)="print()">Print invoice</button><button class="btn ghost" (click)="view.set(null)">Close</button></div></div></div> }`
})
export class AdminOrdersComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService);
  steps = ['Placed', 'Processing', 'Sent', 'Completed']; items = signal<any[]>([]); total = signal(0); page = 1; view = signal<any>(null); q: any = { search: '', status: '', from: '', to: '' };
  statusOptions = [{ label: 'All statuses', value: '' }, { label: 'Placed', value: 'Placed' }, { label: 'Processing', value: 'Processing' }, { label: 'Sent', value: 'Sent' }, { label: 'Completed', value: 'Completed' }];
  ngOnInit() { this.load(); } reset() { this.page = 1; this.load(); } print() { window.print(); }
  load() { this.api.get('admin/orders', { ...this.q, page: this.page, pageSize: 10 }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
  export() { this.api.download('admin/orders/export', 'orders.csv', this.q); }
  advance(o: any) { this.api.post(`admin/orders/${o.orderId}/status`, { status: this.steps[o.statusStep + 1] }).subscribe({
    next: (r: any) => { o.status = r.status; o.statusStep = r.statusStep; o.statusUpdatedAt = r.statusUpdatedAt; this.toast.success(`Order ${o.orderNumber} is now ${r.status}`); }, error: e => this.toast.error(errMsg(e)) }); }
}

/** Books CRUD with cover upload, price and stock. */
@Component({
  selector: 'app-admin-books', standalone: true, imports: [FormsModule, CurrencyPipe],
  template: `<div class="row between mb"><h2 style="margin:0">Books</h2><button class="btn" (click)="edit(null)">+ Add book</button></div>
    <div class="table-wrap"><table><thead><tr><th>Cover</th><th>Title</th><th>Author</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>
      @for (b of items(); track b.bookId) { <tr><td><img [src]="api.img(b.imagePath)" alt="" style="height:50px"></td><td>{{b.title}}</td><td>{{b.author}}</td><td>{{b.price | currency}}</td><td>{{b.stock}}</td><td><span class="badge" [class]="'badge ' + (b.isActive ? 'Completed' : 'Failed')">{{b.isActive ? 'Active' : 'Inactive'}}</span></td>
        <td class="row"><button class="btn sm ghost" (click)="edit(b)">Edit</button>@if (b.isActive) { <button class="btn sm danger" (click)="remove(b)">Deactivate</button> }</td></tr> }</tbody></table></div>
    @if (m()) { <div class="modal-bg" (click)="m.set(null)"><form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()"><h3>{{m().bookId ? 'Edit' : 'Add'}} book</h3>
      <div class="field"><input id="t" [(ngModel)]="m().title" name="t" placeholder=" " required><label for="t">Title</label></div><div class="field"><input id="a" [(ngModel)]="m().author" name="a" placeholder=" "><label for="a">Author</label></div>
      <div class="field"><textarea id="d" [(ngModel)]="m().description" name="d" placeholder=" " style="min-height:80px"></textarea><label for="d">Description</label></div>
      <div class="grid g2"><div class="field"><input id="p" type="number" step="0.01" min="0.01" [(ngModel)]="m().price" name="p" placeholder=" " required><label for="p">Price</label></div><div class="field"><input id="s" type="number" min="0" [(ngModel)]="m().stock" name="s" placeholder=" " required><label for="s">Stock</label></div></div>
      <label class="check"><input type="checkbox" [(ngModel)]="m().isActive" name="ac"><span>Active</span></label>
      <div class="mb"><b>Cover</b><br><input type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)"></div>
      <div class="row"><button class="btn">Save</button><button type="button" class="btn ghost" (click)="m.set(null)">Cancel</button></div></form></div> }`
})
export class AdminBooksComponent implements OnInit {
  api = inject(Api); private toast = inject(ToastService); items = signal<any[]>([]); m = signal<any>(null); file: File | null = null;
  ngOnInit() { this.load(); } load() { this.api.get('admin/books').subscribe(r => this.items.set(r)); }
  edit(b: any) { this.file = null; this.m.set(b ? { ...b } : { title: '', author: '', description: '', price: 10, stock: 10, isActive: true }); }
  pick(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f && f.size > 2 * 1024 * 1024) return void this.toast.error('Max 2 MB.'); this.file = f ?? null; }
  save() { const m = this.m(); if (!m.bookId && !this.file) return void this.toast.error('Please upload a cover.');
    const fd = new FormData(); fd.append('title', m.title); fd.append('author', m.author ?? ''); fd.append('description', m.description ?? ''); fd.append('price', String(m.price)); fd.append('stock', String(m.stock)); fd.append('isActive', String(m.isActive)); if (this.file) fd.append('image', this.file);
    (m.bookId ? this.api.put('admin/books/' + m.bookId, fd) : this.api.post('admin/books', fd)).subscribe({ next: (r: any) => { this.toast.success(r.message); this.m.set(null); this.load(); }, error: e => this.toast.error(errMsg(e)) }); }
  remove(b: any) { if (confirm('Deactivate this book?')) this.api.delete('admin/books/' + b.bookId).subscribe({ next: () => { this.toast.success('Book deactivated'); this.load(); }, error: e => this.toast.error(errMsg(e)) }); }
}
