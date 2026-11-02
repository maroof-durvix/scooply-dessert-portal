import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, errMsg, fieldErrors } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CardFormComponent } from '../../shared/card-form.component';
import { confetti } from '../../core/util';

/**
 * Order form (SRS fields): Name, Email, Contact, Address, Cost (auto, read-only), Paying option (Credit/Debit), Submit.
 * Works for guests and members. Shows "Transaction Completed Successfully" or "Transaction Failed".
 */
@Component({
  selector: 'app-order', standalone: true, imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, CardFormComponent],
  template: `<div class="page container" style="max-width:900px">
    @if (result(); as r) {
      <div class="card center printable">
        @if (r.ok) { <svg class="tick" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M28 52l16 16 28-32"/></svg><h2>Transaction Completed Successfully</h2>
          <p>Order number <b>{{r.data.orderNumber}}</b></p>
          <table style="max-width:460px;margin:auto"><tbody>
            <tr><td>Book</td><td>{{r.data.bookTitle}} × {{r.data.quantity}}</td></tr><tr><td>Amount paid</td><td><b>{{r.data.amount | currency}}</b></td></tr>
            <tr><td>Card</td><td>•••• {{r.data.cardLast4}}</td></tr><tr><td>Deliver to</td><td>{{r.data.customerName}}, {{r.data.address}}</td></tr>
            <tr><td>Date</td><td>{{r.data.orderedAt | date:'medium'}}</td></tr><tr><td>Transaction</td><td style="font-size:.75rem">{{r.data.transactionRef}}</td></tr></tbody></table>
          <div class="row mt" style="justify-content:center"><button class="btn" (click)="print()"><i class="fa-solid fa-print"></i> Print invoice</button><a class="btn alt" routerLink="/books/track">Track order</a><a class="btn ghost" routerLink="/books">More books</a></div>
        } @else { <svg class="tick bad" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M32 32l36 36M68 32L32 68"/></svg><h2>Transaction Failed</h2><p class="muted">{{r.message}}</p>
          <button class="btn" (click)="result.set(null)">Try again</button> }
      </div>
    } @else if (book()) { @let b = book();
      <div class="title"><h1>Order: {{b.title}}</h1></div>
      <form class="card" [class.shake]="shake()" (ngSubmit)="submit()" novalidate>
        <div class="grid g2">
          <div>
            <div class="field" [class.invalid]="err('name')"><input id="n" [(ngModel)]="f.name" name="name" placeholder=" " autocomplete="name"><label for="n">Name</label>@if (err('name')) { <span class="err">{{err('name')}}</span> }</div>
            <div class="field" [class.invalid]="err('email')"><input id="e" type="email" [(ngModel)]="f.email" name="email" placeholder=" " autocomplete="email"><label for="e">Email ID</label>@if (err('email')) { <span class="err">{{err('email')}}</span> }</div>
            <div class="field" [class.invalid]="err('contact')"><input id="c" [(ngModel)]="f.contact" name="contact" placeholder=" " autocomplete="tel"><label for="c">Contact Details</label>@if (err('contact')) { <span class="err">{{err('contact')}}</span> }</div>
            <div class="field" [class.invalid]="err('address')"><textarea id="a" [(ngModel)]="f.address" name="address" placeholder=" " style="min-height:90px"></textarea><label for="a">Delivery address</label>@if (err('address')) { <span class="err">{{err('address')}}</span> }</div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="field"><select id="q" [(ngModel)]="f.qty" name="qty">@for (n of [1,2,3,4,5,6,7,8,9,10]; track n) { <option [ngValue]="n">{{n}}</option> }</select><label for="q">Quantity</label></div>
              <div class="field"><input id="cost" [value]="cost() | currency" readonly aria-readonly="true" placeholder=" " style="font-weight:700;color:var(--primary)"><label for="cost">Cost (auto)</label></div></div>
            <p class="muted" style="font-size:.85rem">{{b.price | currency}} × {{f.qty}} — the final cost is always recalculated by the server.</p>
          </div>
          <div><app-card-form #card/></div>
        </div>
        <button class="btn" [disabled]="busy()" style="width:100%;margin-top:20px;padding:16px;font-size:1.05rem;box-shadow:0 10px 28px rgba(var(--accent-rgb), 0.45)">@if (busy()) { <span class="spinner"></span> Authorizing… } @else { <i class="fa-solid fa-lock" style="font-size:0.9rem"></i> Authorize & Pay {{cost() | currency}} }</button>
      </form>
    } @else if (loading()) { <div class="skeleton" style="height:400px"></div> } @else { <div class="empty">Book not found. <a routerLink="/books">Back to books</a></div> }
  </div>`
})
export class OrderComponent implements OnInit {
  private api = inject(Api); private route = inject(ActivatedRoute); private auth = inject(Auth); private toast = inject(ToastService);
  @ViewChild('card') card!: CardFormComponent;
  book = signal<any>(null); loading = signal(true); busy = signal(false); shake = signal(false); result = signal<{ ok: boolean; data?: any; message?: string } | null>(null);
  f = { name: '', email: '', contact: '', address: '', qty: 1 }; private tried = false; private server: Record<string, string> = {};

  ngOnInit() {
    this.api.get('books/' + this.route.snapshot.paramMap.get('id')).subscribe({ next: b => { this.book.set(b); this.loading.set(false); }, error: () => this.loading.set(false) });
    if (this.auth.isMember()) this.api.get('auth/me').subscribe(u => { this.f.name = u.fullName; this.f.email = u.email; this.f.contact = u.phone; this.f.address = u.address; });   // pre-fill members
  }
  cost() { return Math.round((this.book()?.price ?? 0) * this.f.qty * 100) / 100; }
  err(k: string) {
    if (this.server[k]) return this.server[k]; if (!this.tried) return '';
    const f = this.f;
    return ({ name: !/^[A-Za-z][A-Za-z .'-]{2,59}$/.test(f.name.trim()) ? 'Name: letters and spaces, 3–60 characters.' : '',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? 'Enter a valid email.' : '',
      contact: !/^\+?\d{10,15}$/.test(f.contact.trim()) ? 'Contact: 10–15 digits, + allowed.' : '',
      address: f.address.trim().length < 10 ? 'Address must be at least 10 characters.' : '' } as any)[k];
  }
  print() { window.print(); }
  submit() {
    this.tried = true; this.server = {};
    const cardOk = this.card.validate(), fieldsOk = !['name', 'email', 'contact', 'address'].some(k => this.err(k));
    if (!cardOk || !fieldsOk) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    const c = this.card.value();
    this.busy.set(true);
    this.api.post('books/order', { bookId: this.book().bookId, quantity: this.f.qty, name: this.f.name, email: this.f.email,
      contactNumber: this.f.contact, address: this.f.address, card: c }).subscribe({
      next: d => { this.busy.set(false); this.result.set({ ok: true, data: d }); this.toast.success('Transaction Completed Successfully'); confetti(); },
      error: e => { this.busy.set(false);
        if (e.status === 402) { this.result.set({ ok: false, message: e.error.reason ?? 'Payment declined.' }); this.toast.error('Transaction Failed'); }
        else if (e.status === 400 && e.error?.errors) { const fe = fieldErrors(e); this.card.setServerErrors(fe); this.server = fe; this.toast.error('Please fix the highlighted fields.'); }
        else this.toast.error(errMsg(e)); } });
  }
}
