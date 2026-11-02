import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';

/** Flavor card: photo, status tags, name, two-line teaser and access state. The whole card links to the recipe. */
@Component({
  selector: 'app-flavor-card', standalone: true, imports: [RouterLink],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
  <a class="fc" [routerLink]="['/recipes', f.flavorId]" [attr.aria-label]="f.name + (f.locked ? ' — members only' : ' — view recipe')">
    <div class="fc-media">
      <img [src]="api.img(f.imagePath)" [alt]="f.name + ' ice cream'" loading="lazy" decoding="async">
      <div class="fc-tags">
        @if (f.isFree) { <span class="badge free">Free</span> }
        @if (f.isMostFamous) { <span class="badge"><i class="fa-solid fa-star"></i> Famous</span> }
      </div>
      <span class="fc-go" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
    </div>
    <div class="fc-body">
      <h3 class="fc-name">{{ f.name }}</h3>
      <p class="fc-desc">{{ f.shortDescription || 'Slow-churned with real cream and hand-picked ingredients.' }}</p>
      <div class="fc-meta">
        @if (f.locked) { <i class="fa-solid fa-lock"></i> Members recipe }
        @else { <i class="fa-solid fa-book-open"></i> Full recipe inside }
      </div>
    </div>
  </a>`
})
export class FlavorCardComponent { api = inject(Api); @Input({ required: true }) f!: any; }
