import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnInit, Pipe, PipeTransform, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { CounterDirective, ParallaxDirective } from '../../core/directives';
import { HeroShowcaseComponent, HeroSlide } from '../../shared/hero-showcase.component';
import { FlavorCardComponent } from '../../shared/flavor-card.component';
import { StarsComponent } from '../../shared/stars.component';

@Pipe({ name: 'slice8', standalone: true })
export class Slice8Pipe implements PipeTransform { transform(v: string) { return v.length > 260 ? v.slice(0, 260).replace(/\s+\S*$/, '') + '…' : v; } }

/** Home page: split photo hero + every SRS section, laid out as an editorial creamery site. */
@Component({
  selector: 'app-home', standalone: true, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink, CurrencyPipe, DatePipe, FlavorCardComponent, StarsComponent, Slice8Pipe, HeroShowcaseComponent, ParallaxDirective, CounterDirective],
  styles: [`
    /* ---------- ribbon ---------- */
    .ribbon { position: relative; z-index: 2; padding: 0; margin: clamp(28px, 4vw, 48px) 0; transform: rotate(-1.6deg); }
    .ribbon-in { background: var(--primary); color: var(--on-primary); padding: 18px 0; overflow: hidden; }
    .ribbon-track { display: flex; width: max-content; animation: marquee 50s linear infinite; }
    .ribbon:hover .ribbon-track { animation-play-state: paused; }
    .ribbon-set { display: flex; align-items: center; flex: none; }
    .ribbon-set span { padding: 0 26px; font: italic 300 clamp(1.4rem, 2.6vw, 2.1rem)/1 var(--font-serif); white-space: nowrap; letter-spacing: -0.01em; }
    .ribbon-set i { font-size: 0.4rem; opacity: 0.6; }

    /* ---------- flavor rail ---------- */
    .rail { display: grid; grid-auto-flow: column; grid-auto-columns: clamp(240px, 24vw, 300px); gap: 24px; overflow-x: auto; scroll-snap-type: x mandatory;
      padding: 4px max(24px, calc((100vw - 1240px) / 2)) 24px; scroll-padding-inline: max(24px, calc((100vw - 1240px) / 2)); scrollbar-width: none; }
    .rail::-webkit-scrollbar { display: none; }
    .rail > * { scroll-snap-align: start; }
    .rail-nav { display: flex; gap: 8px; }
    .rail-nav .icon-btn:disabled { opacity: 0.35; cursor: default; }

    /* ---------- story ---------- */
    .story { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: clamp(40px, 7vw, 110px); align-items: center; }
    .story-media { position: relative; }
    .story-arch { aspect-ratio: 4 / 5; border-radius: 999px 999px 24px 24px; overflow: hidden; background: var(--t-vanilla); }
    .story-arch img { width: 100%; height: 100%; object-fit: cover; }
    .story-note { position: absolute; right: -6%; bottom: 10%; max-width: 230px; padding: 18px 20px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow-lg);
      font: italic 400 1.05rem/1.4 var(--font-serif); }
    .story-note small { display: block; margin-top: 8px; font: 600 0.7rem var(--font-sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .story h2 { margin-bottom: 20px; }
    .story-text { color: var(--text-2); font-size: 1.04rem; }
    .values { list-style: none; padding: 0; margin: 32px 0; border-top: 1px solid var(--border); }
    .values li { display: grid; grid-template-columns: 52px 1fr; gap: 4px 12px; padding: 20px 0; border-bottom: 1px solid var(--border); }
    .values .n { font: italic 400 1.1rem var(--font-serif); color: var(--accent); padding-top: 2px; }
    .values b { font: 500 1.2rem var(--font-serif); letter-spacing: -0.01em; }
    .values p { grid-column: 2; margin: 0; color: var(--muted); font-size: 0.94rem; }

    .stats { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: clamp(56px, 8vw, 96px); border-top: 1px solid var(--border); }
    .stat { padding: 28px 24px 0 0; }
    .stat + .stat { padding-left: 24px; border-left: 1px solid var(--border); }
    .stat b { display: block; font: 300 clamp(2.4rem, 6vw, 4.6rem)/1 var(--font-serif); letter-spacing: -0.04em; }
    .stat b sup { font-size: 0.45em; vertical-align: 0.9em; color: var(--accent); }
    .stat > span { display: block; margin-top: 10px; color: var(--muted); font-size: 0.92rem; }

    /* ---------- how it works ---------- */
    .how { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--border); }
    .how-step { padding: 34px 32px 8px 0; }
    .how-step + .how-step { padding-left: 32px; border-left: 1px solid var(--border); }
    .how-num { font: italic 300 3.4rem/1 var(--font-serif); color: var(--accent); margin-bottom: 26px; display: block; }
    .how-step h3 { margin-bottom: 10px; }
    .how-step p { color: var(--muted); margin: 0; }

    /* ---------- plans ---------- */
    .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; align-items: stretch; max-width: 1080px; margin: 0 auto; }
    .plan { position: relative; display: flex; flex-direction: column; padding: 34px 30px 30px; border-radius: var(--radius-lg); background: var(--card); border: 1px solid var(--border-light);
      transition: transform 0.6s var(--ease), box-shadow 0.6s var(--ease); }
    .plan:hover { transform: translateY(-6px); box-shadow: var(--shadow); }
    .plan.best { background: var(--primary); color: var(--on-primary); border-color: transparent; }
    .plan.best .plan-per, .plan.best li, .plan.best .plan-name { color: color-mix(in srgb, var(--on-primary) 75%, transparent); }
    .plan.best .plan-price { color: var(--on-primary); }
    .plan.best li i { color: var(--on-primary); }
    .plan.best .btn { background: var(--on-primary); color: var(--primary); border-color: var(--on-primary); }
    .plan.best .btn::before { background: var(--accent); }
    .plan.best .btn:hover { color: #fff; }
    .plan-flag { position: absolute; top: 24px; right: 24px; font: 600 0.66rem var(--font-sans); letter-spacing: 0.14em; text-transform: uppercase;
      padding: 6px 10px; border-radius: 999px; background: var(--accent); color: #fff; }
    .plan-name { font: 600 0.74rem var(--font-sans); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 18px; }
    .plan-price { font: 300 3.4rem/1 var(--font-serif); letter-spacing: -0.04em; }
    .plan-per { color: var(--muted); font-size: 0.9rem; margin: 8px 0 24px; }
    .plan ul { list-style: none; padding: 22px 0 0; margin: 0 0 28px; border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent); display: grid; gap: 10px; flex: 1; align-content: start; }
    .plan li { display: flex; gap: 10px; font-size: 0.93rem; color: var(--text-2); }
    .plan li i { margin-top: 7px; font-size: 0.7rem; color: var(--accent); }

    /* ---------- hall of fame ---------- */
    .fame { background: var(--footer-bg); color: var(--footer-text); border-radius: clamp(28px, 4vw, 56px); margin: 0 clamp(8px, 1.5vw, 20px); }
    .fame h2, .fame h3, .fame h4 { color: var(--footer-text); }
    .fame h2 em { color: var(--secondary); }
    .fame .eyebrow, .fame .muted { color: color-mix(in srgb, var(--footer-text) 60%, transparent); }
    .fame-perks { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .fame-perks span { padding: 8px 14px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--footer-text) 18%, transparent); font-size: 0.85rem; color: color-mix(in srgb, var(--footer-text) 80%, transparent); }
    .fame-perks i { color: var(--secondary); margin-right: 6px; }
    .champ-solo { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: center; }
    .champ-img { position: relative; aspect-ratio: 5 / 4; border-radius: 24px; overflow: hidden; background: #3a2a1f; }
    .champ-img img { width: 100%; height: 100%; object-fit: cover; }
    .champ-rank { position: absolute; top: 16px; left: 16px; padding: 7px 12px; border-radius: 999px; background: #fbf4ea; color: #2a1c13; font: 600 0.7rem var(--font-sans); letter-spacing: 0.08em; text-transform: uppercase; }
    .champ-rank i { color: #a86a32; margin-right: 6px; }
    .champ-by { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .champ-av { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--secondary); color: #2a1c13; font: 600 1.05rem var(--font-sans); }
    .champ-by b { display: block; font-weight: 600; }
    .champ-by small { color: color-mix(in srgb, var(--footer-text) 60%, transparent); }
    .champ-title { font-size: clamp(1.8rem, 3.4vw, 2.6rem); margin-bottom: 14px; }
    .champ-desc { color: color-mix(in srgb, var(--footer-text) 75%, transparent); }
    .champ-quote { margin: 22px 0; padding: 0 0 0 18px; border-left: 2px solid var(--secondary); font: italic 400 1.1rem/1.5 var(--font-serif); color: var(--footer-text); }
    .champ-meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 0.85rem; color: color-mix(in srgb, var(--footer-text) 60%, transparent); margin-bottom: 26px; }
    .champ-meta b { color: var(--footer-text); font-weight: 600; }
    .champ-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 24px; }
    .champ-card .champ-img { aspect-ratio: 4 / 3; margin-bottom: 18px; }
    .champ-card h3 { font-size: 1.4rem; margin-bottom: 6px; }
    .fame .btn { background: var(--footer-text); color: var(--footer-bg); border-color: var(--footer-text); }
    .fame .btn::before { background: var(--secondary); }
    .fame .btn:hover { color: #1d140e; }
    .fame .btn.ghost { background: transparent; color: var(--footer-text); border-color: color-mix(in srgb, var(--footer-text) 30%, transparent); }
    .fame .btn.ghost::before { background: var(--footer-text); }
    .fame .btn.ghost:hover { color: var(--footer-bg); }
    .fame-cta { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; margin-top: clamp(48px, 6vw, 72px); padding-top: 32px; border-top: 1px solid color-mix(in srgb, var(--footer-text) 14%, transparent); }
    .fame-cta h3 { margin: 0 0 4px; }
    .fame-cta p { margin: 0; color: color-mix(in srgb, var(--footer-text) 65%, transparent); }
    .fame-empty { padding: 48px; text-align: center; border: 1px dashed color-mix(in srgb, var(--footer-text) 25%, transparent); border-radius: 24px; }

    /* ---------- testimonials ---------- */
    .quotes { max-width: 860px; margin: 0 auto; text-align: center; }
    .quote { margin: 0; padding: 0 8px 48px; }
    .quote blockquote { margin: 18px 0 26px; font: 300 clamp(1.5rem, 3.2vw, 2.3rem)/1.35 var(--font-serif); letter-spacing: -0.015em; color: var(--text); }
    .quote cite { font-style: normal; font-weight: 600; }
    .quote cite small { display: block; font-weight: 400; color: var(--muted); margin-top: 2px; }
    swiper-container { --swiper-pagination-color: var(--text); --swiper-pagination-bullet-inactive-color: var(--border-glow); --swiper-pagination-bullet-inactive-opacity: 1; --swiper-pagination-bullet-size: 7px; }

    /* ---------- visit ---------- */
    .visit { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: clamp(32px, 6vw, 96px); }
    .visit-hours { margin-top: 24px; padding: 20px 22px; border-radius: 18px; background: var(--bg-surface); }
    .visit-hours b { display: block; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
    .branches { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border); }
    .branches li { display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; align-items: center; padding: 26px 0; border-bottom: 1px solid var(--border); }
    .branches h3 { margin: 0; font-size: 1.45rem; }
    .branches p { margin: 0; color: var(--muted); font-size: 0.93rem; grid-column: 1; }

    /* ---------- responsive ---------- */
    @media (max-width: 900px) {
      .story, .visit, .champ-solo { grid-template-columns: 1fr; }
      .story-media { max-width: 420px; }
      .story-note { right: 0; }
      .how { grid-template-columns: 1fr; }
      .how-step, .how-step + .how-step { padding: 28px 0; border-left: 0; border-bottom: 1px solid var(--border); }
      .stat, .stat + .stat { padding: 22px 10px 0; }
      .stat:first-child { padding-left: 0; }
      .branches li { grid-template-columns: 1fr; }
    }
  `],
  template: `
  <app-hero-showcase [slides]="heroSlides"/>

  <div class="ribbon" aria-hidden="true">
    <div class="ribbon-in"><div class="ribbon-track">
      @for (k of [0, 1]; track k) {
        <div class="ribbon-set">@for (n of ribbon(); track $index) { <span>{{ n }}</span><i class="fa-solid fa-circle"></i> }</div>
      }
    </div></div>
  </div>

  @if (loading()) {
    <section class="container"><div class="grid g4"><div class="skeleton" style="height:380px"></div><div class="skeleton" style="height:380px"></div><div class="skeleton" style="height:380px"></div><div class="skeleton" style="height:380px"></div></div></section>
  } @else if (d()) { @let h = d();

  <!-- MOST FAMOUS -->
  <section style="padding-bottom:clamp(48px,6vw,80px)">
    <div class="container section-head" data-aos="fade-up">
      <div><span class="eyebrow">Parlour favourites</span><h2>Our most <em>famous</em> flavors</h2></div>
      <div class="row" style="gap:20px">
        <a routerLink="/recipes" class="link-arrow">All recipes <i class="fa-solid fa-arrow-right"></i></a>
        <div class="rail-nav">
          <button class="icon-btn" (click)="slide(-1)" [disabled]="railStart()" aria-label="Previous flavors"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="icon-btn" (click)="slide(1)" [disabled]="railEnd()" aria-label="Next flavors"><i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
    </div>
    <div class="rail" #rail (scroll)="onRail()">
      @for (f of h.mostFamous; track f.flavorId; let i = $index) { <div data-aos="fade-up" [attr.data-aos-delay]="i < 5 ? i * 80 : 0"><app-flavor-card [f]="f"/></div> }
    </div>
  </section>

  <!-- STORY + STATS -->
  <section class="container">
    <div class="story">
      <div class="story-media">
        <div class="story-arch" data-aos="reveal"><img src="/images/flavors/vanilla.jpg" alt="A scoop of vanilla bean ice cream" loading="lazy" parallax="0.08"></div>
        <div class="story-note" data-aos="fade-up" data-aos-delay="300">“The best ice cream tastes of what it’s made from.”<small>— {{ h.site?.ownerName || 'Mr. A' }}, founder</small></div>
      </div>
      <div data-aos="fade-up">
        <span class="eyebrow">Our story</span>
        <h2>Made the slow way, <em>since 1998.</em></h2>
        <p class="story-text">{{ (h.site?.aboutText || '') | slice8 }}</p>
        <ul class="values">
          <li><span class="n">01</span><b>Real ingredients</b><p>Fresh fruit, real cream and roasted nuts — no shortcuts, no powders.</p></li>
          <li><span class="n">02</span><b>Small batches</b><p>Churned in the morning, tasted by Mr. A before it reaches the counter.</p></li>
          <li><span class="n">03</span><b>Recipes, shared</b><p>Every flavor we serve comes with a recipe you can make at home.</p></li>
        </ul>
        <a routerLink="/about" class="link-arrow">Read our story <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
    <div class="stats">
      <div class="stat" data-aos="fade-up"><b><span [counter]="h.stats?.flavors || 20"></span></b><span>Signature flavors</span></div>
      <div class="stat" data-aos="fade-up" data-aos-delay="100"><b><span [counter]="h.stats?.branches || 3"></span></b><span>Parlours in Karachi</span></div>
      <div class="stat" data-aos="fade-up" data-aos-delay="200"><b><span [counter]="(h.stats?.happyCustomers || 12000) / 1000"></span>k<sup>+</sup></b><span>Happy scoopers</span></div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="section-band">
    <div class="container">
      <div class="section-head" data-aos="fade-up">
        <div><span class="eyebrow">How it works</span><h2>From our counter to <em>your kitchen</em></h2></div>
        <a routerLink="/account/register" class="btn">Become a member <i class="fa-solid fa-arrow-right"></i></a>
      </div>
      <div class="how">
        <div class="how-step" data-aos="fade-up"><span class="how-num">01</span><h3>Pick a plan</h3><p>Start free, or join monthly or yearly. Your account is ready in under a minute.</p></div>
        <div class="how-step" data-aos="fade-up" data-aos-delay="100"><span class="how-num">02</span><h3>Unlock the recipes</h3><p>Ingredients, quantities and step-by-step procedures for all twenty parlour flavors.</p></div>
        <div class="how-step" data-aos="fade-up" data-aos-delay="200"><span class="how-num">03</span><h3>Share &amp; win</h3><p>Enter your own creation in our recipe contest for cash prizes and a certificate.</p></div>
      </div>
    </div>
  </section>

  <!-- MEMBERSHIP PLANS -->
  <section class="container">
    <div class="title" data-aos="fade-up"><h2>Membership, <em>simply priced</em></h2><p class="muted">Unlock every recipe in the Scooply collection.</p></div>
    <div class="plans">
      @for (p of h.plans; track p.planId; let i = $index) {
        <div class="plan" [class.best]="p.durationDays >= 365" data-aos="fade-up" [attr.data-aos-delay]="i * 100">
          @if (p.durationDays >= 365) { <span class="plan-flag">Best value</span> }
          <span class="plan-name">{{ p.name }}</span>
          <div class="plan-price">{{ p.price === 0 ? 'Free' : (p.price | currency:undefined:'symbol':'1.0-0') }}</div>
          <div class="plan-per">{{ p.price === 0 ? 'for ' + p.durationDays + ' days' : (p.durationDays >= 365 ? 'per year' : 'per month') }}</div>
          <ul>
            @for (x of perks(p); track x) { <li><i class="fa-solid fa-check"></i>{{ x }}</li> }
          </ul>
          <a class="btn" [class.ghost]="p.durationDays < 365" [routerLink]="['/account/register']" [queryParams]="{ plan: p.planId }">{{ p.price === 0 ? 'Start free' : 'Join ' + p.name }}</a>
        </div>
      }
    </div>
  </section>

  <!-- TOP RECIPE (SRS: hall of fame) -->
  <section class="fame" id="top-recipe">
    <div class="container">
      <div class="section-head" data-aos="fade-up">
        <div>
          <span class="eyebrow">Hall of fame</span>
          <h2>Top recipe — <em>our champions</em></h2>
          <div class="fame-perks">
            <span><i class="fa-solid fa-trophy"></i>Up to Rs. 500 cash prize</span>
            <span><i class="fa-solid fa-award"></i>Certificate signed by Mr. A</span>
            <span><i class="fa-solid fa-ice-cream"></i>Served in our parlours</span>
          </div>
        </div>
      </div>

      @if (h.champions.length === 1) { @let c = h.champions[0];
        <div class="champ-solo">
          <div class="champ-img" data-aos="reveal">
            <img [src]="api.img(c.imagePath)" [alt]="c.recipeTitle" loading="lazy" parallax="0.06">
            <span class="champ-rank"><i class="fa-solid fa-crown"></i>Grand champion</span>
          </div>
          <div data-aos="fade-up">
            <div class="champ-by">
              <span class="champ-av">{{ (c.winnerName || 'S')[0] }}</span>
              <div><b>{{ c.winnerName }}</b><small>Recipe champion</small></div>
            </div>
            <h3 class="champ-title">{{ c.recipeTitle }}</h3>
            @if (c.description) { <p class="champ-desc">{{ c.description }}</p> }
            @if (c.adminRemarks) { <blockquote class="champ-quote">“{{ c.adminRemarks }}”</blockquote> }
            <div class="champ-meta">
              @if (c.prizeAmount) { <span>Prize <b>{{ c.prizeAmount | currency:undefined:'symbol':'1.0-0' }}</b></span> }
              @if (c.certificateNumber) { <span>Certificate <b>{{ c.certificateNumber }}</b></span> }
              <span>Awarded <b>{{ c.awardedOn | date:'MMMM y' }}</b></span>
            </div>
            <div class="row" style="gap:14px">
              <a routerLink="/recipes/submit" class="btn">Submit your recipe <i class="fa-solid fa-arrow-right"></i></a>
              <a routerLink="/recipes" class="btn ghost">Explore recipes</a>
            </div>
          </div>
        </div>
      } @else if (h.champions.length) {
        <div class="champ-grid">
          @for (c of h.champions; track c.submissionId; let i = $index) {
            <article class="champ-card" data-aos="fade-up" [attr.data-aos-delay]="i * 100">
              <div class="champ-img">
                <img [src]="api.img(c.imagePath)" [alt]="c.recipeTitle" loading="lazy" parallax="0.06">
                <span class="champ-rank"><i class="fa-solid" [class.fa-crown]="i === 0" [class.fa-award]="i > 0"></i>{{ i === 0 ? '1st place' : i === 1 ? '2nd place' : '3rd place' }}</span>
              </div>
              <h3>{{ c.recipeTitle }}</h3>
              <p class="muted" style="margin:0 0 6px">by <b style="color:var(--footer-text)">{{ c.winnerName }}</b>@if (c.prizeAmount) { · {{ c.prizeAmount | currency:undefined:'symbol':'1.0-0' }} prize }</p>
              @if (c.description) { <p class="champ-desc" style="font-size:.92rem">{{ c.description }}</p> }
            </article>
          }
        </div>
      } @else {
        <div class="fame-empty">No champions yet — be the first. <a routerLink="/recipes/submit" style="color:var(--footer-text);text-decoration:underline">Submit your recipe</a></div>
      }

      @if (h.champions.length !== 1) {
        <div class="fame-cta" data-aos="fade-up">
          <div><h3>Think you’ve got a winning recipe?</h3><p>Compete for cash prizes, a certificate and a spot on our counter.</p></div>
          <a routerLink="/recipes/submit" class="btn">Submit a recipe <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      }
    </div>
  </section>

  <!-- FEATURED BOOKS -->
  <section class="container shelf">
    <div class="section-head" data-aos="fade-up">
      <div><span class="eyebrow">The Scooply library</span><h2>Recipe books, <em>for the shelf</em></h2></div>
      <a routerLink="/books" class="link-arrow">All books <i class="fa-solid fa-arrow-right"></i></a>
    </div>
    <div class="grid g4">
      @for (b of h.books; track b.bookId; let i = $index) {
        <div class="book-card" data-aos="fade-up" [attr.data-aos-delay]="i * 80">
          <a class="book-img-box" [routerLink]="['/books/order', b.bookId]" [attr.aria-label]="'Order ' + b.title"><img [src]="api.img(b.imagePath)" [alt]="b.title + ' cover'" loading="lazy"></a>
          <h3 class="book-title">{{ b.title }}</h3>
          <span class="book-price">{{ b.price | currency }}</span>
          <div class="book-btn-wrap"><a class="btn ghost sm" [routerLink]="['/books/order', b.bookId]">Buy now</a></div>
        </div>
      }
    </div>
  </section>

  <!-- FREE RECIPES -->
  <section class="section-band">
    <div class="container">
      <div class="section-head" data-aos="fade-up">
        <div><span class="eyebrow">Try before you join</span><h2>Free recipes, <em>on the house</em></h2></div>
        <a routerLink="/recipes/free" class="link-arrow">See all free recipes <i class="fa-solid fa-arrow-right"></i></a>
      </div>
      <div class="grid g3">
        @for (f of h.freeRecipes; track f.flavorId; let i = $index) { <div data-aos="fade-up" [attr.data-aos-delay]="i * 100"><app-flavor-card [f]="f"/></div> }
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="container">
    <div class="quotes" data-aos="fade-up">
      <span class="eyebrow">Kind words</span>
      @if (h.testimonials.length) {
        <swiper-container effect="fade" fade-effect-cross-fade="true" autoplay-delay="6000" autoplay-pause-on-mouse-enter="true" pagination="true" pagination-clickable="true" auto-height="true">
          @for (t of h.testimonials; track $index) {
            <swiper-slide>
              <figure class="quote">
                <app-stars [value]="t.rating" [readonly]="true"/>
                <blockquote>“{{ t.message }}”</blockquote>
                <cite>{{ t.name }}<small>{{ t.subject }}</small></cite>
              </figure>
            </swiper-slide>
          }
        </swiper-container>
      } @else { <div class="empty">No testimonials yet.</div> }
    </div>
  </section>

  <!-- BRANCHES -->
  <section class="container" style="padding-top:0">
    <div class="visit">
      <div data-aos="fade-up">
        <span class="eyebrow">Visit us</span>
        <h2>Come by for <em>a scoop</em></h2>
        <p class="muted">Three parlours across Karachi, each with the full flavor counter and a seat by the window.</p>
        @if (h.site?.workingHours) { <div class="visit-hours"><b>Opening hours</b>{{ h.site.workingHours }}</div> }
      </div>
      <ul class="branches">
        @for (b of h.branches; track b.branchId; let i = $index) {
          <li data-aos="fade-up" [attr.data-aos-delay]="i * 80">
            <h3>{{ b.name }}</h3>
            <a class="link-arrow" [href]="b.mapEmbedUrl || 'https://www.google.com/maps/search/' + encode(b.address)" target="_blank" rel="noopener">Directions <i class="fa-solid fa-arrow-right"></i></a>
            <p>{{ b.address }} · {{ b.phone }}</p>
          </li>
        }
      </ul>
    </div>
  </section>
  }
  `
})
export class HomeComponent implements OnInit {
  api = inject(Api);
  d = signal<any>(null);
  loading = signal(true);
  ribbon = signal<string[]>([]);
  railStart = signal(true);
  railEnd = signal(false);
  @ViewChild('rail') rail?: ElementRef<HTMLElement>;

  /** Hero flavors: real product photography + the panel tint pulled from each scoop. */
  heroSlides: HeroSlide[] = [
    { name: 'Pistachio', img: '/images/flavors/pistachio.jpg', tint: 'var(--t-pist)', blurb: 'Roasted pistachios folded into cool, nutty cream with a pinch of sea salt.' },
    { name: 'Strawberry', img: '/images/flavors/strawberry.jpg', tint: 'var(--t-straw)', blurb: 'Sun-ripened strawberries swirled through sweet cream, finished with fresh mint.' },
    { name: 'Chocolate', img: '/images/flavors/chocolate.jpg', tint: 'var(--t-choc)', blurb: 'Deep, dark and velvety — slow-churned with real cocoa and shaved chocolate.' },
    { name: 'Mango', img: '/images/flavors/mango.jpg', tint: 'var(--t-mango)', blurb: 'Ripe Alphonso mango blended into a silky, sunshine-bright scoop.' },
    { name: 'Butterscotch', img: '/images/flavors/butterscotch.jpg', tint: 'var(--t-butter)', blurb: 'Buttery caramel ribbons and golden toffee crunch in every spoonful.' },
    { name: 'Chocolate Chip', img: '/images/flavors/chocolate-chip.jpg', tint: 'var(--t-vanilla)', blurb: 'Vanilla bean cream loaded with snappy dark chocolate chips.' }
  ];

  ngOnInit() {
    this.ribbon.set(this.heroSlides.map(s => s.name));
    this.api.get('public/home').subscribe({
      next: h => {
        this.d.set(h);
        if (h.flavorNames?.length) this.ribbon.set(h.flavorNames.filter((n: string) => n.length < 22));
        this.loading.set(false);
        setTimeout(() => this.onRail(), 50);
      },
      error: () => this.loading.set(false)
    });
  }

  perks(p: any): string[] {
    if (p.price === 0) return ['Three free parlour recipes', 'Enter the recipe contest', 'Monthly newsletter'];
    const base = ['All 20 member recipes', 'Step-by-step procedures', 'Enter the recipe contest'];
    return p.durationDays >= 365 ? [...base, 'Two months free vs. monthly', 'Early access to new flavors'] : base;
  }

  slide(dir: number) {
    const r = this.rail?.nativeElement; if (!r) return;
    const card = r.firstElementChild as HTMLElement | null;
    r.scrollBy({ left: dir * ((card?.offsetWidth || 280) + 24) * 2, behavior: 'smooth' });
  }
  onRail() {
    const r = this.rail?.nativeElement; if (!r) return;
    this.railStart.set(r.scrollLeft < 8);
    this.railEnd.set(r.scrollLeft + r.clientWidth > r.scrollWidth - 8);
  }
  encode(v: string) { return encodeURIComponent(v); }
}
