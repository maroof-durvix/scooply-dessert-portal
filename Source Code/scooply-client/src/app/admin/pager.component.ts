import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Simple pager used by every admin list (no unbounded queries). */
@Component({
  selector: 'app-pager', standalone: true,
  template: `@if (pages() > 1) { <div class="pager"><button class="btn sm ghost" [disabled]="page <= 1" (click)="pageChange.emit(page - 1)">‹ Prev</button>
    <span>Page {{page}} / {{pages()}} · {{total}} rows</span><button class="btn sm ghost" [disabled]="page >= pages()" (click)="pageChange.emit(page + 1)">Next ›</button></div> }`
})
export class PagerComponent {
  @Input() page = 1; @Input() total = 0; @Input() pageSize = 10; @Output() pageChange = new EventEmitter<number>();
  pages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
}
