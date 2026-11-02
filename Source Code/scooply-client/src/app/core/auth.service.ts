import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { HttpInterceptorFn } from '@angular/common/http';
import { tap, catchError, throwError } from 'rxjs';
import { Api } from './api.service';
import { ToastService } from './toast.service';

export interface Session {
  token: string; expiresAt: string; role: 'Member' | 'Admin'; userId: number; fullName: string; username: string;
  membershipActive: boolean; membershipEndsOn: string | null;
}
const KEY = 'scooply.auth';

/** Holds the JWT session (localStorage when "remember me", otherwise sessionStorage). */
@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  private router = inject(Router);
  session = signal<Session | null>(this.load());
  isMember = computed(() => this.session()?.role === 'Member');
  isAdmin = computed(() => this.session()?.role === 'Admin');

  private load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      const s: Session | null = raw ? JSON.parse(raw) : null;
      return s && new Date(s.expiresAt) > new Date() ? s : null;   // drop expired tokens
    } catch { return null; }
  }
  set(s: Session, remember = false) {
    localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    this.session.set(s);
  }
  login(body: any) { return this.api.post<Session>('auth/login', body).pipe(tap(s => this.set(s, body.rememberMe))); }
  adminLogin(body: any) { return this.api.post<Session>('auth/admin-login', body).pipe(tap(s => this.set(s, body.rememberMe))); }
  logout(to = '/') { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); this.session.set(null); this.router.navigateByUrl(to); }
  /** Re-reads membership status (after renewal etc.). */
  refresh() {
    if (!this.isMember()) return;
    this.api.get('auth/me').subscribe(me => {
      const s = this.session()!; const remember = !!localStorage.getItem(KEY);
      this.set({ ...s, fullName: me.fullName, membershipActive: me.membershipActive, membershipEndsOn: me.membershipEndsOn }, remember);
    });
  }
}

/** Adds the bearer token and handles 401/403 globally. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth), toast = inject(ToastService), api = inject(Api);
  const s = auth.session();
  if (s && req.url.startsWith(api.base)) req = req.clone({ setHeaders: { Authorization: `Bearer ${s.token}` } });
  return next(req).pipe(catchError(e => {
    const isLogin = req.url.includes('/auth/login') || req.url.includes('/auth/admin-login');
    if (e.status === 401 && !isLogin && s) { auth.logout(s.role === 'Admin' ? '/admin/login' : '/account/login'); toast.info('Session expired. Please log in again.'); }
    if (e.status === 403) toast.error('You do not have access to that.');
    return throwError(() => e);
  }));
};

export const memberGuard: CanActivateFn = (_r, state) => {
  const a = inject(Auth), r = inject(Router);
  return a.isMember() ? true : r.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url } });
};
export const adminGuard: CanActivateFn = () => {
  const a = inject(Auth), r = inject(Router);
  return a.isAdmin() ? true : r.createUrlTree(['/admin/login']);
};
