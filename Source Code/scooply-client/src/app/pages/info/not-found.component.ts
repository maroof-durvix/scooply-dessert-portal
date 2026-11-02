import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** On-brand 404 page. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page container center" style="padding:100px 20px 80px">
      <div class="not-found-icon-wrap">
        <i class="fa-solid fa-ice-cream"></i>
      </div>
      <h1 style="font-family:var(--font-serif);margin:20px 0 10px">404 — This Scoop Melted</h1>
      <p class="muted" style="max-width:440px;margin:0 auto 28px;line-height:1.6">The page or recipe you are looking for does not exist or has been moved to our secret cellar.</p>
      <a class="btn" routerLink="/"><i class="fa-solid fa-house" style="margin-right:8px"></i> Back to Home</a>
    </div>
  `,
  styles: [`
    .not-found-icon-wrap {
      width: 140px;
      height: 140px;
      margin: 0 auto;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent-rgb), 0.05));
      border: 2px solid rgba(var(--accent-rgb), 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 4.5rem;
      color: var(--primary);
      box-shadow: 0 16px 45px rgba(var(--accent-rgb), 0.25);
      animation: float 3.2s ease-in-out infinite;
    }
  `]
})
export class NotFoundComponent {}
