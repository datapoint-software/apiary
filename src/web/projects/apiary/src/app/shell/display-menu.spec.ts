import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byRole, queryByRole, settle } from '../testing/dom';
import { DisplayMenu } from './display-menu';
import { DisplaySettings } from './display-settings';

async function render(): Promise<ComponentFixture<DisplayMenu>> {
  localStorage.clear();
  const fixture = TestBed.createComponent(DisplayMenu);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  return fixture;
}

async function openMenu(fixture: ComponentFixture<DisplayMenu>): Promise<void> {
  byRole(fixture, 'button', 'Display and accessibility').click();
  await settle(fixture);
}

function pressed(fixture: ComponentFixture<DisplayMenu>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('[aria-pressed="true"]')].map(
    (b) => b.textContent?.trim() ?? '',
  );
}

describe('DisplayMenu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('opens with the current choice of each setting pressed', async () => {
    const fixture = await render();

    await openMenu(fixture);

    expect(pressed(fixture)).toEqual(['Light', 'Default', 'Automatic', 'Automatic']);
  });

  it('focuses the first pressed choice once open', async () => {
    const fixture = await render();

    await openMenu(fixture);

    expect(document.activeElement?.textContent?.trim()).toBe('Light');
  });

  it('changes a setting', async () => {
    const fixture = await render();
    await openMenu(fixture);

    byRole(fixture, 'button', 'Dark').click();
    await settle(fixture);

    expect(TestBed.inject(DisplaySettings).preferences()).toEqual({ theme: 'dark' });
  });

  it('closes and returns focus to its button when pressed again', async () => {
    const fixture = await render();
    await openMenu(fixture);

    await openMenu(fixture);

    expect([
      queryByRole(fixture, 'dialog', 'Display and accessibility'),
      document.activeElement?.getAttribute('aria-label'),
    ]).toEqual([undefined, 'Display and accessibility']);
  });

  it('closes on Escape', async () => {
    const fixture = await render();
    await openMenu(fixture);

    (fixture.nativeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes when clicking elsewhere on the page', async () => {
    const fixture = await render();
    await openMenu(fixture);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('stays open when clicking inside it', async () => {
    const fixture = await render();
    await openMenu(fixture);

    byRole(fixture, 'button', 'Dark').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).not.toBeNull();
  });
});
