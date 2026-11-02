import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Thin wrapper over HttpClient: builds URLs, strips empty query params, resolves image paths, downloads files. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  readonly base = environment.apiUrl;

  private params(p?: Record<string, any>) {
    let hp = new HttpParams();
    Object.entries(p ?? {}).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v)); });
    return hp;
  }
  get<T = any>(url: string, params?: Record<string, any>) { return this.http.get<T>(this.base + '/api/' + url, { params: this.params(params) }); }
  post<T = any>(url: string, body?: any) { return this.http.post<T>(this.base + '/api/' + url, body ?? {}); }
  put<T = any>(url: string, body?: any) { return this.http.put<T>(this.base + '/api/' + url, body ?? {}); }
  delete<T = any>(url: string) { return this.http.delete<T>(this.base + '/api/' + url); }

  /** Resolves "/images/..." or "/uploads/..." against the API host. Automatically uses high-res .jpg for flavors. */
  img(path?: string | null) {
    if (!path) return '';
    let p = path;
    if ((p.includes('/images/flavors/') || p.includes('/images/books/')) && p.endsWith('.svg')) {
      p = p.replace('.svg', '.jpg');
    }
    return p.startsWith('http') ? p : this.base + p;
  }

  /** Downloads a file (CSV/PDF) through the authenticated HttpClient and triggers a browser save. */
  download(url: string, filename: string, params?: Record<string, any>) {
    this.http.get(this.base + '/api/' + url, { params: this.params(params), responseType: 'blob' }).subscribe(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
    });
  }
}

/** Extracts a friendly message from any API error shape (custom {error}, ProblemDetails, validation errors). */
export function errMsg(e: any): string {
  const b = e?.error;
  if (e?.status === 0) return 'Cannot reach the server. Is the API running?';
  if (b?.reason) return `${b.error}: ${b.reason}`;
  if (b?.error) return b.error;
  if (b?.errors) { const first = Object.values(b.errors)[0] as any; return Array.isArray(first) ? first[0] : String(first); }
  return b?.title || 'Something went wrong. Please try again.';
}

/** Flattens API validation errors to { lastSegmentLowercase: message } for inline display. */
export function fieldErrors(e: any): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(e?.error?.errors ?? {}).forEach(([k, v]) => {
    out[k.split('.').pop()!.toLowerCase()] = Array.isArray(v) ? (v as string[])[0] : String(v);
  });
  return out;
}
