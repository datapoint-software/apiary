import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { currentLanguage } from '../i18n/language';
import { CalendarButton } from './calendar-button';

@Component({
  selector: 'ap-calendar-host',
  imports: [CalendarButton],
  template: `<input
      aria-label="Starts"
      [value]="value()"
      (input)="typed.set(starts.value)"
      #starts
    />
    <ap-calendar-button
      label="Starts"
      [target]="starts"
      [withTime]="withTime()"
      [min]="min()"
      [max]="max()"
    />`,
})
class CalendarHost {
  readonly value = signal('2026-11-03 14:30');
  readonly withTime = signal(true);
  readonly min = signal<number | null>(null);
  readonly max = signal<number | null>(null);
  readonly typed = signal('');
}

let fixture: ComponentFixture<CalendarHost>;

async function render(change: (host: CalendarHost) => void = () => undefined): Promise<void> {
  fixture = TestBed.createComponent(CalendarHost);
  change(fixture.componentInstance);
  await fixture.whenStable();
}

async function settle(): Promise<void> {
  await fixture.whenStable();
}

function element(): HTMLElement {
  return fixture.nativeElement;
}

function calendarButton(): HTMLButtonElement {
  return element().querySelector('.ap-dtp-btn') as HTMLButtonElement;
}

function popover(): HTMLElement | null {
  return element().querySelector('[role="dialog"]');
}

function title(): string {
  return element().querySelector('.ap-cal-title')?.textContent?.trim() ?? '';
}

function day(label: string): HTMLButtonElement {
  return element().querySelector(`.ap-day[aria-label="${label}"]`) as HTMLButtonElement;
}

function namedButton(name: string): HTMLButtonElement {
  return [...element().querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent?.trim()) === name,
  ) as HTMLButtonElement;
}

function focusedLabel(): string | null {
  return document.activeElement?.getAttribute('aria-label') ?? null;
}

function input(): HTMLInputElement {
  return element().querySelector('input') as HTMLInputElement;
}

async function open(): Promise<void> {
  calendarButton().click();
  await settle();
}

async function press(key: string, shiftKey = false): Promise<void> {
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
  );
  await settle();
}

async function click(target: HTMLElement): Promise<void> {
  target.click();
  await settle();
}

async function choose(select: string, value: string): Promise<void> {
  const element = popover()?.querySelector(`select[aria-label="${select}"]`) as HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(new Event('change'));
  await settle();
}

describe('CalendarButton', () => {
  afterEach(() => {
    currentLanguage.set('en');
    vi.useRealTimers();
  });

  it('names its button after the field', async () => {
    await render();

    expect(calendarButton().getAttribute('aria-label')).toBe('Starts: choose on a calendar');
  });

  it('starts closed', async () => {
    await render();

    expect([popover(), calendarButton().getAttribute('aria-expanded')]).toEqual([null, 'false']);
  });

  it('opens a dialog named after the field', async () => {
    await render();

    await open();

    expect(popover()?.getAttribute('aria-label')).toBe('Starts: choose a date');
  });

  it('reports that it is expanded once open', async () => {
    await render();

    await open();

    expect(calendarButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on the month of the field’s date', async () => {
    await render();

    await open();

    expect(title()).toBe('November 2026');
  });

  it('marks the field’s date as selected', async () => {
    await render();

    await open();

    expect(day('Tuesday, November 3, 2026').getAttribute('aria-pressed')).toBe('true');
  });

  it('marks days of other months as outside', async () => {
    await render();

    await open();

    expect(day('Monday, October 26, 2026').hasAttribute('data-outside')).toBe(true);
  });

  it('focuses the selected day', async () => {
    await render();

    await open();

    expect(focusedLabel()).toBe('Tuesday, November 3, 2026');
  });

  it('makes only the focused day tabbable', async () => {
    await render();

    await open();

    expect(element().querySelectorAll('.ap-day[tabindex="0"]').length).toBe(1);
  });

  it.each([
    ['ArrowRight', 'Wednesday, November 4, 2026'],
    ['ArrowLeft', 'Monday, November 2, 2026'],
    ['ArrowDown', 'Tuesday, November 10, 2026'],
    ['ArrowUp', 'Tuesday, October 27, 2026'],
    ['Home', 'Monday, November 2, 2026'],
    ['End', 'Sunday, November 8, 2026'],
    ['PageDown', 'Thursday, December 3, 2026'],
    ['PageUp', 'Saturday, October 3, 2026'],
  ])('moves focus with %s to %s', async (key, label) => {
    await render();
    await open();

    await press(key);

    expect(focusedLabel()).toBe(label);
  });

  it('moves a year with Shift and Page Down', async () => {
    await render();
    await open();

    await press('PageDown', true);

    expect(focusedLabel()).toBe('Wednesday, November 3, 2027');
  });

  it('shows the next month when focus moves into it', async () => {
    await render();
    await open();

    await press('PageDown');

    expect(title()).toBe('December 2026');
  });

  it('shows the next month', async () => {
    await render();
    await open();

    await click(namedButton('Next month'));

    expect(title()).toBe('December 2026');
  });

  it('shows the previous month', async () => {
    await render();
    await open();

    await click(namedButton('Previous month'));

    expect(title()).toBe('October 2026');
  });

  it('writes the chosen day into the field, keeping the time', async () => {
    await render();
    await open();

    await click(day('Friday, November 20, 2026'));

    expect(input().value).toBe('2026-11-20 14:30');
  });

  it('tells the field its value changed', async () => {
    await render();
    await open();

    await click(day('Friday, November 20, 2026'));

    expect(fixture.componentInstance.typed()).toBe('2026-11-20 14:30');
  });

  it('stays open after choosing a day when there is a time to choose', async () => {
    await render();
    await open();

    await click(day('Friday, November 20, 2026'));

    expect(popover()).not.toBeNull();
  });

  it('writes the chosen hour into the field', async () => {
    await render();
    await open();

    await choose('Hour', '9');

    expect(input().value).toBe('2026-11-03 09:30');
  });

  it('writes the chosen minutes into the field', async () => {
    await render();
    await open();

    await choose('Minutes', '45');

    expect(input().value).toBe('2026-11-03 14:45');
  });

  it('offers no time for a date alone', async () => {
    await render((host) => {
      host.value.set('2026-11-03');
      host.withTime.set(false);
    });

    await open();

    expect(popover()?.querySelector('select')).toBeNull();
  });

  it('writes a date alone without a time', async () => {
    await render((host) => {
      host.value.set('2026-11-03');
      host.withTime.set(false);
    });
    await open();

    await click(day('Friday, November 20, 2026'));

    expect(input().value).toBe('2026-11-20');
  });

  it('closes after choosing a date alone', async () => {
    await render((host) => {
      host.value.set('2026-11-03');
      host.withTime.set(false);
    });
    await open();

    await click(day('Friday, November 20, 2026'));

    expect(popover()).toBeNull();
  });

  it('chooses today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 8, 0));
    await render();
    await open();

    await click(namedButton('Today'));

    expect(input().value).toBe('2026-11-25 14:30');
  });

  it('opens on the next hour today when the field is empty', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 8, 10));
    await render((host) => host.value.set(''));

    await open();

    expect(focusedLabel()).toBe('Wednesday, November 25, 2026');
  });

  it('marks today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 8, 0));
    await render();

    await open();

    expect(day('Wednesday, November 25, 2026').getAttribute('aria-current')).toBe('date');
  });

  it('disables days before the minimum', async () => {
    await render((host) => host.min.set(Date.UTC(2026, 10, 10, 12, 0)));

    await open();

    expect([
      day('Monday, November 9, 2026').disabled,
      day('Tuesday, November 10, 2026').disabled,
    ]).toEqual([true, false]);
  });

  it('disables days after the maximum', async () => {
    await render((host) => host.max.set(Date.UTC(2026, 10, 10, 12, 0)));

    await open();

    expect([
      day('Tuesday, November 10, 2026').disabled,
      day('Wednesday, November 11, 2026').disabled,
    ]).toEqual([false, true]);
  });

  it('closes with Escape', async () => {
    await render();
    await open();

    await press('Escape');

    expect(popover()).toBeNull();
  });

  it('returns focus to its button when closed with Escape', async () => {
    await render();
    await open();

    await press('Escape');

    expect(document.activeElement).toBe(calendarButton());
  });

  it('closes with Done', async () => {
    await render();
    await open();

    await click(namedButton('Done'));

    expect(popover()).toBeNull();
  });

  it('closes when pressing outside it', async () => {
    await render();
    await open();

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle();

    expect(popover()).toBeNull();
  });

  it('stays open when pressing inside it', async () => {
    await render();
    await open();

    day('Friday, November 20, 2026').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle();

    expect(popover()).not.toBeNull();
  });

  it('shows the month in Portuguese', async () => {
    currentLanguage.set('pt-PT');
    await render();

    await open();

    expect(title()).toBe('novembro de 2026');
  });
});
