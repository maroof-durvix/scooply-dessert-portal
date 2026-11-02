import { Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, Output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  host: {
    '[class.is-open]': 'isOpen()',
    '[style.z-index]': "isOpen() ? '99999' : '20'"
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CustomSelectComponent),
    multi: true
  }],
  template: `
    <div class="custom-select-wrap" [class.open]="isOpen()" [class.align-right]="isRightAligned()" [class.disabled]="disabled">
      <button
        type="button"
        class="custom-select-trigger"
        (click)="toggle()"
        [disabled]="disabled"
        [attr.aria-expanded]="isOpen()">
        <span class="trigger-label">{{ selectedLabel() }}</span>
        <i class="fa-solid fa-chevron-down chevron-icon"></i>
      </button>

      @if (isOpen()) {
        <div class="custom-select-menu" role="listbox">
          @for (opt of normalizedOptions(); track $index) {
            <div
              class="custom-select-option"
              [class.active]="isSelected(opt.value)"
              role="option"
              [attr.aria-selected]="isSelected(opt.value)"
              (click)="select(opt)">
              <span>{{ opt.label }}</span>
              @if (isSelected(opt.value)) {
                <i class="fa-solid fa-check check-icon"></i>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
      font-family: var(--font-sans, system-ui, sans-serif);
      position: relative;
      z-index: 20;
    }
    :host.is-open {
      z-index: 99999 !important;
    }
    .custom-select-wrap {
      position: relative;
      display: inline-block;
      min-width: 140px;
    }
    .custom-select-wrap.open {
      z-index: 99999 !important;
    }
    .custom-select-trigger {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--card);
      color: var(--text);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      font: 500 0.9rem inherit;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: all 0.22s ease;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .custom-select-trigger:hover:not(:disabled) {
      border-color: var(--primary);
      background: var(--card-hover, #1a1a1a);
      box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.22);
    }
    .custom-select-wrap.open .custom-select-trigger {
      border-color: var(--primary);
      background: var(--card-hover, #1a1a1a);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.28);
    }
    .trigger-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chevron-icon {
      font-size: 0.78rem;
      color: var(--primary);
      transition: transform 0.25s ease;
      flex-shrink: 0;
    }
    .custom-select-wrap.open .chevron-icon {
      transform: rotate(180deg);
    }
    .custom-select-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 100%;
      width: max-content;
      max-width: 280px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--card);
      border: 1.5px solid var(--border-glow, rgba(var(--accent-rgb), 0.45));
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.95);
      z-index: 99999 !important;
      animation: menuPop .2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .custom-select-wrap.align-right .custom-select-menu {
      left: auto;
      right: 0;
    }
    :host-context([data-theme=light]) .custom-select-trigger {
      background: #ffffff;
      color: var(--text);
      border-color: rgba(18, 18, 18, 0.18);
    }
    :host-context([data-theme=light]) .custom-select-trigger:hover,
    :host-context([data-theme=light]) .custom-select-wrap.open .custom-select-trigger {
      background: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.3);
    }
    :host-context([data-theme=light]) .custom-select-menu {
      background: #ffffff;
      border-color: rgba(18, 18, 18, 0.15);
      box-shadow: 0 14px 38px rgba(0, 0, 0, 0.15);
    }
    :host-context([data-theme=light]) .custom-select-option {
      color: var(--text);
    }
    :host-context([data-theme=light]) .custom-select-option:hover {
      background: rgba(var(--accent-rgb), 0.25);
      color: var(--text);
    }
    :host-context([data-theme=light]) .custom-select-option.active {
      background: rgba(var(--accent-rgb), 0.35);
      color: var(--text);
    }
    :host-context([data-theme=light]) .chevron-icon,
    :host-context([data-theme=light]) .check-icon {
      color: var(--text);
    }
    @keyframes menuPop {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .custom-select-option {
      padding: 9px 12px;
      border-radius: 9px;
      cursor: pointer;
      color: var(--text);
      font-size: 0.88rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      transition: all 0.18s ease;
      user-select: none;
    }
    .custom-select-option:hover {
      background: rgba(var(--accent-rgb), 0.16);
      color: var(--primary);
      padding-left: 16px;
    }
    .custom-select-option.active {
      background: rgba(var(--accent-rgb), 0.25);
      color: var(--primary);
      font-weight: 700;
    }
    .check-icon {
      font-size: 0.75rem;
      color: var(--primary);
      flex-shrink: 0;
    }
    .custom-select-wrap.disabled {
      opacity: 0.55;
      pointer-events: none;
    }
  `]
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() set options(val: any[]) {
    this._rawOptions = val || [];
  }
  @Input() placeholder = '';
  @Output() selectionChange = new EventEmitter<any>();

  isOpen = signal(false);
  value: any = '';
  disabled = false;
  private _rawOptions: any[] = [];

  constructor(private el: ElementRef) {}

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: any): void {
    this.value = v === undefined || v === null ? '' : v;
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void { this.disabled = isDisabled; }

  normalizedOptions(): SelectOption[] {
    return this._rawOptions.map(opt => {
      if (opt && typeof opt === 'object' && 'label' in opt) {
        return { label: String(opt.label), value: opt.value };
      }
      return { label: String(opt), value: opt };
    });
  }

  selectedLabel(): string {
    const list = this.normalizedOptions();
    const found = list.find(o => String(o.value) === String(this.value));
    if (found) return found.label;
    if (this.placeholder) return this.placeholder;
    return list.length ? list[0].label : '';
  }

  isSelected(val: any): boolean {
    return String(val) === String(this.value);
  }

  isRightAligned = signal(false);

  toggle(): void {
    if (this.disabled) return;
    this.isOpen.update(o => !o);
    if (this.isOpen()) {
      try {
        const rect = this.el.nativeElement.getBoundingClientRect();
        this.isRightAligned.set((window.innerWidth - rect.left) < 260);
      } catch {}
    } else {
      this.onTouched();
    }
  }

  select(opt: SelectOption): void {
    this.value = opt.value;
    this.onChange(this.value);
    this.selectionChange.emit(this.value);
    this.onTouched();
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
