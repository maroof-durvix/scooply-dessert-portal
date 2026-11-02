import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { brand, formatCard, luhn } from '../core/util';

/**
 * Payment card form with an animated 3D preview (flips on CVV focus), brand detection,
 * live number formatting and Luhn/expiry/CVV validation. Parent reads value() after validate().
 */
@Component({
  selector: 'app-card-form', standalone: true, imports: [FormsModule],
  template: `
  <div class="cc" [class.flipped]="flipped()">
    <div class="cc-in">
      <div class="f"><div class="meta"><span>{{cardType}} card</span><b>{{brandName || 'CARD'}}</b></div>
        <div class="num">{{number || '•••• •••• •••• ••••'}}</div>
        <div class="meta"><span>{{holder || 'Card holder'}}</span><span>{{expiry || 'MM/YY'}}</span></div></div>
      <div class="f b"><div class="strip"></div><div class="cv">{{cvv ? cvvMask : '•••'}}</div></div>
    </div>
  </div>

  <p style="margin:0 0 6px;font-weight:600">Paying option</p>
  <div class="radio-pills" role="radiogroup">
    <label><input type="radio" name="ct" value="Credit" [(ngModel)]="cardType"><span><i class="fa-solid fa-credit-card" style="margin-right:6px"></i>Credit Card</span></label>
    <label><input type="radio" name="ct" value="Debit" [(ngModel)]="cardType"><span><i class="fa-solid fa-building-columns" style="margin-right:6px"></i>Debit Card</span></label>
  </div>
  @if (e('cardtype')) { <span class="err">{{e('cardtype')}}</span> }

  <div class="field" [class.invalid]="e('holdername')"><input id="cc-h" [(ngModel)]="holder" name="holder" placeholder=" " autocomplete="cc-name" (focus)="flipped.set(false)"><label for="cc-h">Card holder name</label>
    @if (e('holdername')) { <span class="err">{{e('holdername')}}</span> }</div>
  <div class="field" [class.invalid]="e('number')"><input id="cc-n" [ngModel]="number" (ngModelChange)="number = fmt($event)" name="number" inputmode="numeric" placeholder=" " autocomplete="cc-number" (focus)="flipped.set(false)"><label for="cc-n">Card number</label>
    @if (e('number')) { <span class="err">{{e('number')}}</span> }</div>
  <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
    <div class="field" [class.invalid]="e('expiry')"><input id="cc-e" [ngModel]="expiry" (ngModelChange)="expiry = fmtExp($event)" name="expiry" placeholder=" " inputmode="numeric" autocomplete="cc-exp" (focus)="flipped.set(false)"><label for="cc-e">Expiry (MM/YY)</label>
      @if (e('expiry')) { <span class="err">{{e('expiry')}}</span> }</div>
    <div class="field" [class.invalid]="e('cvv')"><input id="cc-c" [(ngModel)]="cvv" name="cvv" type="password" inputmode="numeric" maxlength="4" placeholder=" " autocomplete="cc-csc" (focus)="flipped.set(true)" (blur)="flipped.set(false)"><label for="cc-c">CVV</label>
      @if (e('cvv')) { <span class="err">{{e('cvv')}}</span> }</div>
  </div>
  <p class="muted" style="font-size:.8rem">Demo cards: <b>4111 1111 1111 1111</b> succeeds · <b>4000 0000 0000 0002</b> is declined. Any future expiry, CVV 123.</p>`
})
export class CardFormComponent {
  @Input() amountLabel = '';
  cardType: 'Credit' | 'Debit' = 'Credit'; holder = ''; number = ''; expiry = ''; cvv = '';
  flipped = signal(false); private touched = false; private server: Record<string, string> = {};

  get brandName() { return brand(this.number); }
  get cvvMask() { return '•'.repeat(this.cvv.length); }
  fmt(v: string) { return formatCard(v); }
  fmtExp(v: string) { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }

  /** Local validation message for a field ('' when OK). */
  private local(): Record<string, string> {
    const o: Record<string, string> = {};
    if (!/^[A-Za-z][A-Za-z .'-]{2,79}$/.test(this.holder.trim())) o['holdername'] = 'Enter the card holder name (letters only).';
    if (!luhn(this.number)) o['number'] = 'Card number is invalid.';
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(this.expiry);
    if (!m) o['expiry'] = 'Use MM/YY.'; else if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) o['expiry'] = 'This card has expired.';
    const len = this.brandName === 'Amex' ? 4 : 3;
    if (!new RegExp(`^\\d{${len}}$`).test(this.cvv)) o['cvv'] = `CVV must be ${len} digits.`;
    return o;
  }
  e(k: string) { return this.server[k] || (this.touched ? this.local()[k] : '') || ''; }
  /** Shows errors; returns true when the card is well-formed. */
  validate() { this.touched = true; this.server = {}; return Object.keys(this.local()).length === 0; }
  setServerErrors(m: Record<string, string>) { this.touched = true; this.server = m; }
  value() { return { holderName: this.holder.trim(), number: this.number, expiry: this.expiry, cvv: this.cvv, cardType: this.cardType }; }
}
