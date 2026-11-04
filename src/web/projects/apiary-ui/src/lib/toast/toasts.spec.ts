import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastAction } from './toast';
import { Toaster } from './toaster';
import { Toasts } from './toasts';

let fixture: ComponentFixture<Toasts>;

function anAction(runs: string[]): ToastAction {
  return { label: 'Undo', run: () => runs.push('undone') };
}

async function render(show: (toaster: Toaster) => void): Promise<HTMLElement> {
  fixture = TestBed.createComponent(Toasts);
  show(TestBed.inject(Toaster));
  await fixture.whenStable();
  return fixture.nativeElement;
}

async function renderWithFakeTimers(): Promise<HTMLElement> {
  const region = await render(() => undefined);
  vi.useFakeTimers();
  TestBed.inject(Toaster).show('Route saved');
  fixture.detectChanges();
  return region;
}

function toast(region: HTMLElement): HTMLElement {
  return region.querySelector('.ap-toast') as HTMLElement;
}

function button(region: HTMLElement, name: string): HTMLButtonElement {
  return [...region.querySelectorAll('button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent?.trim()) === name,
  ) as HTMLButtonElement;
}

describe('Toasts', () => {
  afterEach(() => vi.useRealTimers());

  it('announces new toasts politely', async () => {
    const region = await render(() => undefined);

    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('shows a toast’s text', async () => {
    const region = await render((toaster) => toaster.show('Route saved'));

    expect(toast(region).textContent?.trim()).toBe('Route saved');
  });

  it('shows a toast’s heading', async () => {
    const region = await render((toaster) =>
      toaster.show('shop.example.com is live.', { heading: 'Route saved' }),
    );

    expect(toast(region).querySelector('.ap-toast-title')?.textContent).toBe('Route saved');
  });

  it.each([
    ['ok', 'status'],
    ['info', 'status'],
    ['error', 'alert'],
  ] as const)('announces a %s toast as %s', async (tone, role) => {
    const region = await render((toaster) => toaster.show('Route saved', { tone }));

    expect(toast(region).getAttribute('role')).toBe(role);
  });

  it('removes a toast when it is dismissed', async () => {
    const region = await render((toaster) => toaster.show('Route saved'));

    button(region, 'Dismiss').click();
    await fixture.whenStable();

    expect(toast(region)).toBeNull();
  });

  it('runs a toast’s action', async () => {
    const runs: string[] = [];
    const region = await render((toaster) =>
      toaster.show('Route deleted', { action: anAction(runs) }),
    );

    button(region, 'Undo').click();

    expect(runs).toEqual(['undone']);
  });

  it('removes a toast once its action runs', async () => {
    const region = await render((toaster) =>
      toaster.show('Route deleted', { action: anAction([]) }),
    );

    button(region, 'Undo').click();
    await fixture.whenStable();

    expect(toast(region)).toBeNull();
  });

  it('keeps a toast while the pointer is over it', async () => {
    const region = await renderWithFakeTimers();

    toast(region).dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(10_000);
    fixture.detectChanges();

    expect(toast(region)).not.toBeNull();
  });

  it('keeps a toast while it has focus', async () => {
    const region = await renderWithFakeTimers();

    button(region, 'Dismiss').focus();
    vi.advanceTimersByTime(10_000);
    fixture.detectChanges();

    expect(toast(region)).not.toBeNull();
  });

  it('dismisses a toast after the pointer leaves it', async () => {
    const region = await renderWithFakeTimers();
    toast(region).dispatchEvent(new MouseEvent('mouseenter'));

    toast(region).dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(5000);
    fixture.detectChanges();

    expect(toast(region)).toBeNull();
  });
});
