import { Component, OnInit, inject, signal } from '@angular/core';
import { Api } from '../../core/api.service';
import { FlavorCardComponent } from '../../shared/flavor-card.component';

/** Most Famous Flavors: route is protected by memberGuard (registered users only). */
@Component({
  selector: 'app-famous', standalone: true, imports: [FlavorCardComponent],
  template: `<div class="page container"><div class="title"><h1><i class="fa-solid fa-crown" style="color:var(--primary);margin-right:10px"></i>Most Famous Flavors</h1><p class="muted">Members-only favourites.</p></div>
    @if (loading()) { <div class="skeleton" style="height:340px"></div> }
    <div class="grid g3">@for (f of items(); track f.flavorId) { <app-flavor-card [f]="f"/> }</div></div>`
})
export class FamousComponent implements OnInit {
  private api = inject(Api); items = signal<any[]>([]); loading = signal(true);
  ngOnInit() {
    this.api.get<any[]>('recipes/most-famous').subscribe({
      next: r => {
        const list = (r || []).filter((f: any) => f.name !== 'Strawberry' && f.name !== 'Vanilla');
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
