import { Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, Output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalendarDay {
  date: Date;
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  host: {
    '[class.is-open]': 'isOpen()',
    '[style.z-index]': "isOpen() ? '99999' : '20'"
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CustomDatePickerComponent),
    multi: true
  }],
  template: `
    <div class="date-picker-wrap" [class.open]="isOpen()" [class.align-right]="isRightAligned()" [class.disabled]="disabled">
      <div class="date-picker-trigger" (click)="toggle()">
        <span class="date-label" [class.placeholder]="!value">
          {{ displayValue() }}
        </span>

        <div class="trigger-icons">
          @if (value) {
            <button type="button" class="clear-btn" (click)="clear($event)" title="Clear date"><i class="fa-solid fa-xmark"></i></button>
          }
          <i class="fa-solid fa-calendar-days calendar-icon"></i>
        </div>
      </div>

      @if (isOpen()) {
        <div class="date-picker-popup">
          <div class="picker-header">
            <button type="button" class="nav-btn" (click)="prevMonth($event)" title="Previous month"><i class="fa-solid fa-chevron-left"></i></button>
            <div class="month-title">{{ currentMonthName() }} {{ currentYear() }}</div>
            <button type="button" class="nav-btn" (click)="nextMonth($event)" title="Next month"><i class="fa-solid fa-chevron-right"></i></button>
          </div>

          <div class="weekdays-grid">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div class="days-grid">
            @for (day of calendarDays(); track day.dateString) {
              <button
                type="button"
                class="day-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.selected]="day.isSelected"
                (click)="selectDate(day)">
                {{ day.dayNumber }}
              </button>
            }
          </div>

          <div class="picker-footer">
            <button type="button" class="footer-btn ghost" (click)="selectToday()">Today</button>
            @if (value) {
              <button type="button" class="footer-btn ghost" (click)="clear($event)">Clear</button>
            }
          </div>
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
    .date-picker-wrap {
      position: relative;
      display: inline-block;
      min-width: 145px;
    }
    .date-picker-wrap.open {
      z-index: 99999 !important;
    }
    .date-picker-trigger {
      height: 42px;
      padding: 0 12px 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: var(--card, #181310);
      color: var(--text);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      font: 500 0.9rem inherit;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: all 0.22s ease;
      box-sizing: border-box;
      user-select: none;
    }
    .date-picker-trigger:hover {
      border-color: var(--primary);
      background: var(--card-hover, #1a1a1a);
      box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.22);
    }
    .date-picker-wrap.open .date-picker-trigger {
      border-color: var(--primary);
      background: var(--card-hover, #1a1a1a);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.28);
    }
    .date-label {
      font-size: 0.88rem;
      white-space: nowrap;
    }
    .date-label.placeholder {
      color: var(--muted, #9e8f82);
      opacity: 0.85;
    }
    .trigger-icons {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .calendar-icon {
      color: var(--primary);
      font-size: 0.95rem;
      transition: transform 0.2s ease;
    }
    .date-picker-trigger:hover .calendar-icon {
      transform: scale(1.12);
    }
    .clear-btn {
      background: none;
      border: none;
      color: var(--muted, #9e8f82);
      font-size: 0.78rem;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 50%;
      line-height: 1;
      transition: color 0.2s;
    }
    .clear-btn:hover {
      color: #ef4444;
    }
    .date-picker-popup {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 280px;
      max-width: calc(100vw - 32px);
      background: var(--card);
      border: 1.5px solid var(--border-glow, rgba(var(--accent-rgb), 0.45));
      border-radius: 16px;
      padding: 14px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
      z-index: 99999 !important;
      animation: calPop .2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }
    .date-picker-wrap.align-right .date-picker-popup {
      left: auto;
      right: 0;
    }
    :host-context([data-theme=light]) .date-picker-trigger {
      background: #ffffff;
      color: var(--text);
      border-color: rgba(18, 18, 18, 0.18);
    }
    :host-context([data-theme=light]) .date-picker-trigger:hover,
    :host-context([data-theme=light]) .date-picker-wrap.open .date-picker-trigger {
      background: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.25);
    }
    :host-context([data-theme=light]) .calendar-icon {
      color: var(--text);
    }
    :host-context([data-theme=light]) .date-picker-popup {
      background: #ffffff;
      border-color: rgba(18, 18, 18, 0.15);
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.16);
    }
    :host-context([data-theme=light]) .month-title {
      color: var(--text);
    }
    :host-context([data-theme=light]) .nav-btn {
      background: #fafafa;
      border-color: rgba(18, 18, 18, 0.15);
      color: var(--text);
    }
    :host-context([data-theme=light]) .nav-btn:hover {
      background: rgba(var(--accent-rgb), 0.3);
      color: var(--text);
      border-color: var(--primary);
    }
    :host-context([data-theme=light]) .weekdays-grid {
      color: #666666;
    }
    :host-context([data-theme=light]) .day-cell {
      color: var(--text);
    }
    :host-context([data-theme=light]) .day-cell:hover:not(.selected) {
      background: rgba(var(--accent-rgb), 0.25);
      color: var(--text);
    }
    :host-context([data-theme=light]) .day-cell.other-month {
      color: rgba(18, 18, 18, 0.3);
    }
    :host-context([data-theme=light]) .day-cell.today:not(.selected) {
      border-color: var(--card);
      color: var(--text);
    }
    :host-context([data-theme=light]) .footer-btn {
      background: #fafafa;
      border-color: rgba(18, 18, 18, 0.15);
      color: var(--text);
    }
    :host-context([data-theme=light]) .footer-btn:hover {
      background: rgba(var(--accent-rgb), 0.35);
      color: var(--text);
      border-color: var(--primary);
    }
    @keyframes calPop {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(var(--accent-rgb), 0.2);
    }
    .month-title {
      font-family: var(--font-sans);
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text);
      letter-spacing: 0.02em;
    }
    .nav-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(var(--accent-rgb), 0.25);
      background: rgba(255, 255, 255, 0.04);
      color: var(--primary);
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .nav-btn:hover {
      background: rgba(var(--accent-rgb), 0.2);
      border-color: var(--primary);
      transform: scale(1.08);
    }
    .weekdays-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted, #cbd5e1);
      margin-bottom: 8px;
    }
    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .day-cell {
      height: 32px;
      border: none;
      background: none;
      color: var(--text);
      font: 500 0.85rem inherit;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s ease;
      box-sizing: border-box;
    }
    .day-cell:hover:not(.selected) {
      background: rgba(var(--accent-rgb), 0.18);
      color: var(--primary);
      transform: scale(1.06);
    }
    .day-cell.other-month {
      color: rgba(255, 255, 255, 0.25);
    }
    .day-cell.today:not(.selected) {
      border: 1px solid var(--primary);
      color: var(--primary);
      font-weight: 700;
    }
    .day-cell.selected {
      background: var(--grad, linear-gradient(135deg, var(--primary), var(--primary-dark)));
      color: var(--text);
      font-weight: 800;
      box-shadow: 0 4px 14px rgba(var(--accent-rgb), 0.45);
    }
    .picker-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(var(--accent-rgb), 0.2);
    }
    .footer-btn {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid rgba(var(--accent-rgb), 0.35);
      background: rgba(var(--accent-rgb), 0.12);
      color: var(--primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .footer-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--text);
    }
    .date-picker-wrap.disabled {
      opacity: 0.55;
      pointer-events: none;
    }
  `]
})
export class CustomDatePickerComponent implements ControlValueAccessor {
  @Input() placeholder = 'dd-mm-yyyy';
  @Output() dateChange = new EventEmitter<string>();

  isOpen = signal(false);
  value = '';
  disabled = false;

  currentMonth = new Date().getMonth();
  currentYearVal = new Date().getFullYear();

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(private el: ElementRef) {}

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: any): void {
    this.value = v || '';
    if (this.value) {
      const parts = this.value.split('-');
      if (parts.length === 3) {
        this.currentYearVal = parseInt(parts[0], 10);
        this.currentMonth = parseInt(parts[1], 10) - 1;
      }
    }
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void { this.disabled = isDisabled; }

  displayValue(): string {
    return this.value || this.placeholder;
  }

  currentMonthName(): string {
    return this.monthNames[this.currentMonth];
  }

  currentYear(): number {
    return this.currentYearVal;
  }

  calendarDays(): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstDayIndex = new Date(this.currentYearVal, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYearVal, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYearVal, this.currentMonth, 0).getDate();

    const todayStr = this.formatDate(new Date());

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(this.currentYearVal, this.currentMonth - 1, d);
      const str = this.formatDate(prevDate);
      days.push({
        date: prevDate,
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === this.value
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(this.currentYearVal, this.currentMonth, d);
      const str = this.formatDate(curDate);
      days.push({
        date: curDate,
        dateString: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isSelected: str === this.value
      });
    }

    // Next month padding up to total 42 (6 rows) or 35 (5 rows)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(this.currentYearVal, this.currentMonth + 1, d);
      const str = this.formatDate(nextDate);
      days.push({
        date: nextDate,
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isSelected: str === this.value
      });
    }

    return days;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  isRightAligned = signal(false);

  toggle(): void {
    if (this.disabled) return;
    this.isOpen.update(o => !o);
    if (this.isOpen()) {
      try {
        const rect = this.el.nativeElement.getBoundingClientRect();
        this.isRightAligned.set((window.innerWidth - rect.left) < 310);
      } catch {}
    } else {
      this.onTouched();
    }
  }

  prevMonth(e: Event): void {
    e.stopPropagation();
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYearVal--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth(e: Event): void {
    e.stopPropagation();
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYearVal++;
    } else {
      this.currentMonth++;
    }
  }

  selectDate(day: CalendarDay): void {
    this.value = day.dateString;
    this.onChange(this.value);
    this.dateChange.emit(this.value);
    this.onTouched();
    this.isOpen.set(false);
  }

  selectToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYearVal = today.getFullYear();
    this.value = this.formatDate(today);
    this.onChange(this.value);
    this.dateChange.emit(this.value);
    this.onTouched();
    this.isOpen.set(false);
  }

  clear(e: Event): void {
    e.stopPropagation();
    this.value = '';
    this.onChange('');
    this.dateChange.emit('');
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
