/** Luhn checksum (client-side mirror of the server rule). */
export function luhn(num: string): boolean {
  const d = num.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0, dbl = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (dbl) { n *= 2; if (n > 9) n -= 9; } sum += n; dbl = !dbl; }
  return sum % 10 === 0;
}
export function brand(num: string): 'Visa' | 'Mastercard' | 'Amex' | '' {
  const d = num.replace(/\D/g, '');
  if (d.startsWith('4')) return 'Visa';
  const p2 = +d.slice(0, 2), p4 = +d.slice(0, 4);
  if (p2 === 34 || p2 === 37) return 'Amex';
  if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) return 'Mastercard';
  return '';
}
/** Live card number formatting: groups of 4 (4-6-5 for Amex). */
export function formatCard(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 19);
  if (brand(d) === 'Amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(.{4})/g, '$1 ').trim();
}
export function passwordScore(p: string): number {
  return [/.{8,}/, /[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
}

/** Canvas confetti burst (sprinkles) used on registration, payment and submission success. */
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '3000' });
  c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const ctx = c.getContext('2d')!, colors = ['#5b3a29', '#b8763a', '#e9c9a0', '#f3d6d2', '#dde3c5', '#f6e2ae'];
  const ps = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height / 3, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 4,
    w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * .4, col: colors[Math.floor(Math.random() * colors.length)] }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
    if (++frames < 150) requestAnimationFrame(tick); else c.remove();
  })();
}

/** Resolves theme tokens (`var(--x)`) for canvas / Chart.js, which can't read CSS variables. */
export function css(v: string): string {
  const st = getComputedStyle(document.documentElement);
  return v.replace(/var\((--[\w-]+)\)/g, (_, n) => st.getPropertyValue(n).trim() || '#000');
}
