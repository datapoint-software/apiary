import { TestBed } from '@angular/core/testing';
import { ToastAction } from './toast';
import { Toaster } from './toaster';

function anAction(): ToastAction {
  return { label: 'Undo', run: () => undefined };
}

function texts(toaster: Toaster): string[] {
  return toaster.toasts().map((toast) => toast.text);
}

describe('Toaster', () => {
  let toaster: Toaster;

  beforeEach(() => {
    vi.useFakeTimers();
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => vi.useRealTimers());

  it('shows a toast', () => {
    toaster.show('Route saved');

    expect(texts(toaster)).toEqual(['Route saved']);
  });

  it('shows a success toast by default', () => {
    toaster.show('Route saved');

    expect(toaster.toasts()[0].tone).toBe('ok');
  });

  it('keeps the heading and action it is given', () => {
    const action = anAction();

    toaster.show('Route deleted', { tone: 'info', heading: 'Deleted', action });

    expect(toaster.toasts()[0]).toMatchObject({ tone: 'info', heading: 'Deleted', action });
  });

  it('stacks toasts in the order they were shown', () => {
    toaster.show('Route saved');
    toaster.show('Certificate renewed');

    expect(texts(toaster)).toEqual(['Route saved', 'Certificate renewed']);
  });

  it('gives each toast its own id', () => {
    toaster.show('Route saved');
    toaster.show('Route saved');

    expect(new Set(toaster.toasts().map((toast) => toast.id)).size).toBe(2);
  });

  it('dismisses a toast', () => {
    toaster.show('Route saved');
    toaster.show('Certificate renewed');

    toaster.dismiss(toaster.toasts()[0].id);

    expect(texts(toaster)).toEqual(['Certificate renewed']);
  });

  it('keeps a toast for almost five seconds', () => {
    toaster.show('Route saved');

    vi.advanceTimersByTime(4999);

    expect(texts(toaster)).toEqual(['Route saved']);
  });

  it('dismisses a toast after five seconds', () => {
    toaster.show('Route saved');

    vi.advanceTimersByTime(5000);

    expect(texts(toaster)).toEqual([]);
  });

  it('keeps a toast with an action for longer than five seconds', () => {
    toaster.show('Route deleted', { action: anAction() });

    vi.advanceTimersByTime(5000);

    expect(texts(toaster)).toEqual(['Route deleted']);
  });

  it('dismisses a toast with an action after eight seconds', () => {
    toaster.show('Route deleted', { action: anAction() });

    vi.advanceTimersByTime(8000);

    expect(texts(toaster)).toEqual([]);
  });

  it('keeps an error toast until it is dismissed', () => {
    toaster.show('Couldn’t save the route', { tone: 'error' });

    vi.advanceTimersByTime(60_000);

    expect(texts(toaster)).toEqual(['Couldn’t save the route']);
  });

  it('keeps a paused toast', () => {
    toaster.show('Route saved');

    toaster.pause(toaster.toasts()[0].id);
    vi.advanceTimersByTime(60_000);

    expect(texts(toaster)).toEqual(['Route saved']);
  });

  it('gives a resumed toast its full time again', () => {
    toaster.show('Route saved');
    const { id } = toaster.toasts()[0];
    vi.advanceTimersByTime(4000);
    toaster.pause(id);

    toaster.resume(id);
    vi.advanceTimersByTime(4000);

    expect(texts(toaster)).toEqual(['Route saved']);
  });

  it('dismisses a resumed toast once its time is up', () => {
    toaster.show('Route saved');
    const { id } = toaster.toasts()[0];
    toaster.pause(id);

    toaster.resume(id);
    vi.advanceTimersByTime(5000);

    expect(texts(toaster)).toEqual([]);
  });

  it('ignores resuming a toast that was dismissed', () => {
    toaster.show('Route saved');
    const { id } = toaster.toasts()[0];
    toaster.dismiss(id);

    toaster.resume(id);

    expect(texts(toaster)).toEqual([]);
  });
});
