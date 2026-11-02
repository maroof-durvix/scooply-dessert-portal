import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; text: string; }

/** Global toast notifications (success / error / info). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private n = 0;
  private push(type: Toast['type'], text: string) {
    const t = { id: ++this.n, type, text };
    this.toasts.update(l => [...l, t]);
    setTimeout(() => this.dismiss(t.id), 4500);
  }
  success(t: string) { this.push('success', t); }
  error(t: string) { this.push('error', t); }
  info(t: string) { this.push('info', t); }
  dismiss(id: number) { this.toasts.update(l => l.filter(x => x.id !== id)); }
}
