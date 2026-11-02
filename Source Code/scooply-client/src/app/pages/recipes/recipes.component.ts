import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { FlavorCardComponent } from '../../shared/flavor-card.component';

/** All flavors with live search, filter chips and sort. */
@Component({
  selector: 'app-recipes', standalone: true, imports: [FormsModule, FlavorCardComponent],
  template: `<div class="page container">
    <div class="title"><h1>All Recipes</h1><p class="muted">20 signature flavors. Guests see teasers; members unlock the full recipe.</p></div>
    <div class="row between mb">
      <div class="field" style="margin:0;flex:1;min-width:220px"><input id="q" [(ngModel)]="search" (ngModelChange)="debounce()" placeholder=" " aria-label="Search flavors"><label for="q">Search flavors…</label></div>
      <div class="row">@for (c of chips; track c.k) { <button class="btn sm" [class.ghost]="filter() !== c.k" (click)="setFilter(c.k)">{{c.l}}</button> }
        <select [(ngModel)]="sort" (ngModelChange)="load()" aria-label="Sort" style="padding:10px;border-radius:12px;border:2px solid var(--border);background:var(--card);color:var(--text)"><option value="name">Name A–Z</option><option value="newest">Newest</option></select></div>
    </div>
    @if (loading()) { <div class="grid g3"><div class="skeleton" style="height:340px"></div><div class="skeleton" style="height:340px"></div><div class="skeleton" style="height:340px"></div></div> }
    @else if (!items().length) { <div class="empty">No flavors match your search.</div> }
    @else { <div class="grid g3">@for (f of items(); track f.flavorId) { <app-flavor-card [f]="f" data-aos="fade-up"/> }</div> }
  </div>`
})
export class RecipesComponent implements OnInit {
  private api = inject(Api);
  items = signal<any[]>([]); loading = signal(true); filter = signal('all'); search = ''; sort = 'name'; private t: any;
  chips = [{ k: 'all', l: 'All' }, { k: 'free', l: 'Free' }, { k: 'famous', l: 'Most Famous' }];
  ngOnInit() { this.load(); }
  setFilter(k: string) { this.filter.set(k); this.load(); }
  debounce() { clearTimeout(this.t); this.t = setTimeout(() => this.load(), 250); }
  load() { this.loading.set(true); this.api.get('recipes', { search: this.search, filter: this.filter(), sort: this.sort })
    .subscribe({ next: r => { this.items.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}
