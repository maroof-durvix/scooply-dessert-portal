import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Animated star rating: interactive (form) or read-only (display). */
@Component({
  selector: 'app-stars', standalone: true,
  template: `<span role="radiogroup" aria-label="Rating">@for (s of [1,2,3,4,5]; track s) {
    <button type="button" [disabled]="readonly" (click)="pick(s)" (mouseenter)="hover = readonly ? 0 : s" (mouseleave)="hover = 0"
      [attr.aria-label]="s + ' star'" style="background:none;border:0;padding:0 2px;cursor:pointer;font-size:1.6rem;transition:transform .2s"
      [style.transform]="(hover || value) >= s ? 'scale(1.2)' : 'scale(1)'" [style.color]="(hover || value) >= s ? 'var(--accent)' : 'var(--border-glow)'"><i class="fa-solid fa-star" style="font-size:1.3rem"></i></button>}</span>`
})
export class StarsComponent {
  @Input() value = 0; @Input() readonly = false; @Output() valueChange = new EventEmitter<number>(); hover = 0;
  pick(n: number) { if (!this.readonly) { this.value = n; this.valueChange.emit(n); } }
}
