import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  selector: 'ap-empty-state-host',
  imports: [EmptyState],
  template: `<ap-empty-state heading="No routes yet">
    Add a route to send visitors to a service.
    <button type="button" emptyActions>Add route</button>
  </ap-empty-state>`,
})
class EmptyStateHost {}

async function render(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(EmptyStateHost);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('EmptyState', () => {
  it('shows its heading', async () => {
    expect((await render()).querySelector('h2')?.textContent).toBe('No routes yet');
  });

  it('shows its text', async () => {
    expect((await render()).querySelector('p')?.textContent?.trim()).toBe(
      'Add a route to send visitors to a service.',
    );
  });

  it('shows its actions after the text', async () => {
    expect((await render()).querySelector('p + button')?.textContent).toBe('Add route');
  });

  it('hides its decoration from assistive technology', async () => {
    expect((await render()).querySelector('.ap-empty-mark')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
