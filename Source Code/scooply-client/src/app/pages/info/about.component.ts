import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { ParallaxDirective } from '../../core/directives';

/** About Us: the parlor and its owner (content comes from Admin → Site settings). */
@Component({
  selector: 'app-about', standalone: true, imports: [RouterLink, ParallaxDirective],
  template: `
    <div class="page container">
      @if (s(); as s) {
        <header class="ab-head">
          <span class="eyebrow">About Scooply</span>
          <h1 class="lines"><span class="ln"><span>A single cart,</span></span><span class="ln"><span>a <em>very</em> big dream.</span></span></h1>
        </header>

        <div class="ab-story">
          <div class="ab-media" data-aos="reveal"><div class="ab-arch"><img src="/images/flavors/chocolate-chip.jpg" alt="A bowl of chocolate chip ice cream" loading="lazy" parallax="0.08"></div></div>
          <div data-aos="fade-up">
            <h2>Our <em>story</em></h2>
            <p class="ab-lead">{{ s.site.aboutText }}</p>
            <p class="muted">Famous for taste and quality, our parlor now serves happy customers across {{ s.branches.length }} branches.</p>
            <figure class="ab-quote">
              <blockquote>“{{ s.site.ownerQuote }}”</blockquote>
              <figcaption><b>{{ s.site.ownerName }}</b>Founder &amp; master ice-cream maker</figcaption>
            </figure>
          </div>
        </div>

        <section class="ab-journey">
          <div class="section-head" data-aos="fade-up"><div><span class="eyebrow">Since 1998</span><h2>Our <em>journey</em></h2></div></div>
          <ol class="ab-years">
            <li data-aos="fade-up"><b>1998</b><h3>The first cart</h3><p>A single cart, one vanilla recipe and a big dream.</p></li>
            <li data-aos="fade-up" data-aos-delay="100"><b>2008</b><h3>Our flagship parlor</h3><p>The Clifton parlor opens with twenty signature flavors.</p></li>
            <li data-aos="fade-up" data-aos-delay="200"><b>2015</b><h3>Growing branches</h3><p>New branches across the city bring Scooply closer to you.</p></li>
            <li data-aos="fade-up" data-aos-delay="300"><b>Today</b><h3>Scooply online</h3><p>Recipes, books and a recipe contest for everyone.</p></li>
          </ol>
        </section>

        <section class="ab-values">
          <div class="title" data-aos="fade-up"><h2>What we <em>believe</em></h2></div>
          <div class="grid g3">
            <div class="ab-val" data-aos="fade-up" style="--t: var(--t-pist)"><i class="fa-solid fa-seedling"></i><h3>Real ingredients</h3><p>Fresh fruit, real cream, no artificial shortcuts.</p></div>
            <div class="ab-val" data-aos="fade-up" data-aos-delay="100" style="--t: var(--t-straw)"><i class="fa-solid fa-star"></i><h3>Honest quality</h3><p>Small handcrafted batches, tasted by Mr. A himself.</p></div>
            <div class="ab-val" data-aos="fade-up" data-aos-delay="200" style="--t: var(--t-mango)"><i class="fa-solid fa-heart"></i><h3>Shared joy</h3><p>We share our secrets so everyone can scoop happiness at home.</p></div>
          </div>
        </section>

        <section class="ab-branches">
          <div class="section-head" data-aos="fade-up"><div><span class="eyebrow">Visit</span><h2>Our <em>branches</em></h2></div><a routerLink="/contact" class="link-arrow">Contact us <i class="fa-solid fa-arrow-right"></i></a></div>
          <div class="grid g3">
            @for (b of s.branches; track b.branchId; let i = $index) {
              <div class="card" data-aos="fade-up" [attr.data-aos-delay]="i * 80">
                <span class="ab-n">{{ '0' + (i + 1) }}</span>
                <h3>{{ b.name }}</h3>
                <p class="muted" style="margin:0">{{ b.address }}<br>{{ b.phone }}</p>
              </div>
            }
          </div>
        </section>
      }
      @else { <div class="skeleton" style="height:420px"></div> }
    </div>
  `,
  styles: [`
    .ab-head { max-width: 900px; margin-bottom: clamp(48px, 6vw, 80px); }
    .ab-head h1 { font-size: clamp(3rem, 8vw, 6.6rem); line-height: 0.98; font-weight: 350; letter-spacing: -0.035em; margin: 0; }
    .ab-story { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(40px, 7vw, 110px); align-items: center; }
    .ab-arch { aspect-ratio: 4 / 5; border-radius: 999px 999px 24px 24px; overflow: hidden; background: var(--t-vanilla); }
    .ab-arch img { width: 100%; height: 100%; object-fit: cover; }
    .ab-lead { font-size: 1.15rem; line-height: 1.75; color: var(--text-2); }
    .ab-quote { margin: 36px 0 0; padding: 28px 0 0; border-top: 1px solid var(--border); }
    .ab-quote blockquote { margin: 0 0 14px; font: italic 300 clamp(1.4rem, 2.6vw, 1.9rem)/1.35 var(--font-serif); letter-spacing: -0.01em; }
    .ab-quote figcaption { font-size: 0.88rem; color: var(--muted); }
    .ab-quote b { color: var(--text); margin-right: 8px; }
    .ab-years { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--border); }
    .ab-years li { padding: 28px 24px 0 0; }
    .ab-years li + li { padding-left: 24px; border-left: 1px solid var(--border); }
    .ab-years b { display: block; font: italic 300 2.4rem/1 var(--font-serif); color: var(--accent); margin-bottom: 18px; }
    .ab-years h3 { font-size: 1.3rem; margin-bottom: 6px; }
    .ab-years p { color: var(--muted); margin: 0; font-size: 0.94rem; }
    .ab-values { padding-bottom: 0; }
    .ab-val { padding: 32px; border-radius: var(--radius-lg); background: var(--t); }
    .ab-val i { font-size: 1.3rem; color: var(--accent); margin-bottom: 40px; display: block; }
    .ab-val h3 { margin-bottom: 8px; }
    .ab-val p { margin: 0; color: var(--text-2); }
    .ab-n { display: block; font: italic 400 1rem var(--font-serif); color: var(--accent); margin-bottom: 26px; }
    @media (max-width: 900px) {
      .ab-story { grid-template-columns: 1fr; }
      .ab-media { max-width: 400px; }
      .ab-years { grid-template-columns: 1fr 1fr; }
      .ab-years li, .ab-years li + li { padding: 24px 16px 24px 0; border-left: 0; border-bottom: 1px solid var(--border); }
    }
  `]
})
export class AboutComponent implements OnInit {
  private api = inject(Api);
  s = signal<any>(null);
  ngOnInit() { this.api.get('public/site').subscribe(s => this.s.set(s)); }
}
