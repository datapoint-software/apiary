import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Banner, BannerTone } from './banner';

@Component({
  selector: 'ap-banner-host',
  imports: [Banner],
  template: `<ap-banner [tone]="tone()" [heading]="heading()" [role]="role()">
    The certificate expires in 3 days.
    <button type="button" bannerActions>Renew</button>
  </ap-banner>`,
})
class BannerHost {
  readonly tone = signal<BannerTone>('info');
  readonly heading = signal('');
  readonly role = signal<'alert' | 'status' | null>(null);
}

async function render(change: (host: BannerHost) => void = () => undefined): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(BannerHost);
  change(fixture.componentInstance);
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('.ap-banner');
}

describe('Banner', () => {
  it('shows its text', async () => {
    expect((await render()).textContent).toContain('The certificate expires in 3 days.');
  });

  it('places actions in the actions area', async () => {
    expect((await render()).querySelector('.ap-banner-actions button')?.textContent).toBe('Renew');
  });

  it.each<BannerTone>(['info', 'ok', 'warn', 'critical'])('styles the %s tone', async (tone) => {
    expect((await render((host) => host.tone.set(tone))).classList).toContain(`ap-banner-${tone}`);
  });

  it('shows a heading when it has one', async () => {
    const banner = await render((host) => host.heading.set('Certificate expiring'));

    expect(banner.querySelector('.ap-banner-title')?.textContent).toBe('Certificate expiring');
  });

  it('shows no heading without one', async () => {
    expect((await render()).querySelector('.ap-banner-title')).toBeNull();
  });

  it('has no role unless it is given one', async () => {
    expect((await render()).hasAttribute('role')).toBe(false);
  });

  it.each<'alert' | 'status'>(['alert', 'status'])('can be announced as %s', async (role) => {
    expect((await render((host) => host.role.set(role))).getAttribute('role')).toBe(role);
  });

  it('hides its icon from assistive technology', async () => {
    expect((await render()).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
