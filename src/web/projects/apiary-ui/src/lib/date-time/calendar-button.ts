import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { addMonths, dayMs, dayStart, formatUtc, hourMs, minuteMs, parseUtc } from './utc-date';

interface CalendarDay {
  readonly ms: number;
  readonly date: number;
  readonly label: string;
  readonly isOutside: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isAllowed: boolean;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hours = [...Array(24).keys()];
const minutes = [...Array(12).keys()].map((i) => i * 5);

@Component({
  selector: 'ap-calendar-button',
  imports: [Button, Icon, CdkTrapFocus],
  templateUrl: './calendar-button.html',
  host: {
    style: 'display: contents',
    '(document:mousedown)': 'closeOnOutside($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarButton {
  readonly target = input.required<HTMLInputElement>();
  readonly label = input.required<string>();
  readonly withTime = input(true);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);

  protected readonly icons = { calendar: Calendar, previous: ChevronLeft, next: ChevronRight };
  protected readonly weekdays = weekdays;
  protected readonly hours = hours;
  protected readonly minutes = minutes;
  protected readonly isOpen = signal(false);
  protected readonly position = signal({ top: 0, left: 0 });
  protected readonly month = signal(0);
  protected readonly focused = signal(0);
  protected readonly selected = signal<number | null>(null);
  protected readonly hour = signal(0);
  protected readonly minute = signal(0);
  private readonly button = viewChild.required<ElementRef<HTMLElement>>('button');
  private readonly popover = viewChild<ElementRef<HTMLElement>>('popover');
  private shouldFocusDay = false;

  protected readonly title = computed(() => {
    const date = new Date(this.month());
    return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  });

  protected readonly weeks = computed<CalendarDay[][]>(() => {
    const first = new Date(this.month());
    const lead = (first.getUTCDay() + 6) % 7;
    const start = this.month() - lead * dayMs;
    const today = dayStart(Date.now());
    return [...Array(6).keys()].map((week) =>
      [...Array(7).keys()].map((day) => {
        const ms = start + (week * 7 + day) * dayMs;
        const date = new Date(ms);
        return {
          ms,
          date: date.getUTCDate(),
          label: `${weekdays[day]}, ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
          isOutside: date.getUTCMonth() !== first.getUTCMonth(),
          isToday: ms === today,
          isSelected: ms === this.selected(),
          isAllowed: this.allows(ms),
        };
      }),
    );
  });

  constructor() {
    afterRenderEffect(() => {
      this.focused();
      const popover = this.popover()?.nativeElement;
      if (popover && this.shouldFocusDay) {
        this.shouldFocusDay = false;
        popover.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
      }
    });
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    const parsed = parseUtc(this.target().value, this.withTime());
    const base = parsed ?? Math.ceil(Date.now() / hourMs) * hourMs;
    const date = new Date(base);
    this.selected.set(parsed === null ? null : dayStart(parsed));
    this.hour.set(date.getUTCHours());
    this.minute.set(Math.floor(date.getUTCMinutes() / 5) * 5);
    this.moveTo(dayStart(base));
    this.place();
    this.isOpen.set(true);
  }

  protected choose(day: CalendarDay): void {
    if (!day.isAllowed) {
      return;
    }
    this.selected.set(day.ms);
    this.moveTo(day.ms);
    this.write();
    if (!this.withTime()) {
      this.close();
    }
  }

  protected step(months: number): void {
    this.focused.set(addMonths(this.focused(), months));
    this.month.set(addMonths(this.month(), months));
  }

  protected today(): void {
    const today = dayStart(Date.now());
    this.selected.set(today);
    this.moveTo(today);
    this.write();
  }

  protected setTime(part: 'hour' | 'minute', value: string): void {
    (part === 'hour' ? this.hour : this.minute).set(Number(value));
    if (this.selected() === null) {
      this.selected.set(this.focused());
    }
    this.write();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
      return;
    }
    if (!(event.target as HTMLElement).classList.contains('ap-day')) {
      return;
    }
    const focus = this.focused();
    const weekday = (new Date(focus).getUTCDay() + 6) % 7;
    const moves: Record<string, number> = {
      ArrowLeft: focus - dayMs,
      ArrowRight: focus + dayMs,
      ArrowUp: focus - 7 * dayMs,
      ArrowDown: focus + 7 * dayMs,
      Home: focus - weekday * dayMs,
      End: focus + (6 - weekday) * dayMs,
      PageUp: addMonths(focus, event.shiftKey ? -12 : -1),
      PageDown: addMonths(focus, event.shiftKey ? 12 : 1),
    };
    if (event.key in moves) {
      event.preventDefault();
      this.moveTo(moves[event.key]);
    }
  }

  protected closeOnOutside(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.isOpen() && !this.popover()?.nativeElement.contains(target) && !this.button().nativeElement.contains(target)) {
      this.close(false);
    }
  }

  protected close(refocus = true): void {
    this.isOpen.set(false);
    this.target().dispatchEvent(new Event('blur'));
    if (refocus) {
      this.button().nativeElement.focus();
    }
  }

  private moveTo(ms: number): void {
    const date = new Date(ms);
    this.month.set(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    this.focused.set(ms);
    this.shouldFocusDay = true;
  }

  private write(): void {
    const selected = this.selected();
    if (selected === null) {
      return;
    }
    const time = this.withTime() ? this.hour() * hourMs + this.minute() * minuteMs : 0;
    const target = this.target();
    target.value = formatUtc(selected + time, this.withTime());
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private allows(ms: number): boolean {
    const min = this.min();
    const max = this.max();
    return (min === null || ms >= dayStart(min)) && (max === null || ms <= dayStart(max));
  }

  private place(): void {
    const field = this.button().nativeElement.parentElement ?? this.button().nativeElement;
    const rect = field.getBoundingClientRect();
    const width = 304;
    const height = this.withTime() ? 440 : 390;
    const below = rect.bottom + 6;
    const top = below + height > innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    const left = Math.min(Math.max(8, rect.right - width), innerWidth - width - 8);
    this.position.set({ top, left });
  }
}
