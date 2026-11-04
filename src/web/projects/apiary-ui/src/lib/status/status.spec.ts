import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Status, Tone } from './status';

@Component({
  selector: 'ap-status-host',
  imports: [Status],
  template: `<ap-status [tone]="tone()">Healthy</ap-status>`,
})
class StatusHost {
  readonly tone = signal<Tone>('ok');
}

async function render(tone?: Tone): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(StatusHost);
  fixture.componentInstance.tone.set(tone ?? 'ok');
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('.ap-status');
}

describe('Status', () => {
  it('shows its text', async () => {
    expect((await render()).textContent?.trim()).toBe('Healthy');
  });

  it.each<Tone>(['ok', 'info', 'warn', 'critical', 'off'])('styles the %s tone', async (tone) => {
    expect((await render(tone)).classList).toContain(`ap-status-${tone}`);
  });

  it('hides the dot from assistive technology', async () => {
    expect((await render()).querySelector('.ap-dot')?.getAttribute('aria-hidden')).toBe('true');
  });
});
