import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';

/** Order the Books of the Recipe: list with image, title, author, description, price and a Buy Now link. */
@Component({
  selector: 'app-books', standalone: true, imports: [RouterLink, CurrencyPipe],
  template: `<div class="page container"><div class="title"><h1>Order the books of <em>the recipe</em></h1><p class="muted">Open to members and guests. <a routerLink="/books/track">Track an order</a></p></div>
    @if (loading()) { <div class="grid g4"><div class="skeleton" style="height:280px"></div><div class="skeleton" style="height:280px"></div><div class="skeleton" style="height:280px"></div><div class="skeleton" style="height:280px"></div></div> }
    <div class="grid g4">@for (b of items(); track b.bookId) {
      <div class="card hover center book-card" data-aos="fade-up">
        <div class="book-img-box"><img [src]="api.img(b.imagePath)" [alt]="b.title + ' cover'" loading="lazy"></div>
        <h3 class="book-title">{{b.title}}</h3>
        <p class="book-desc">{{b.description}}</p>
        <span class="book-price">{{b.price | currency}}</span>
        <div class="book-btn-wrap">
          @if (b.inStock) { <a class="btn ghost" [routerLink]="['/books/order', b.bookId]">Buy now <i class="fa-solid fa-arrow-right"></i></a> }
          @else { <span class="badge Failed">Out of stock</span> }
        </div>
      </div> }</div>
  </div>`
})
export class BooksComponent implements OnInit {
  api = inject(Api); items = signal<any[]>([]); loading = signal(true);
  ngOnInit() {
    this.api.get<any[]>('books').subscribe({
      next: r => {
        const list = (r || []).filter((b: any) => !b.title?.toLowerCase().includes('signature collection'));
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
