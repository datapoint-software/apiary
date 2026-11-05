import { ComponentFixture, TestBed } from '@angular/core/testing';
import { byLabel, definitionOf, settle, textOf, type } from '../testing/dom';
import { TryRequest } from './try-request';

const trusted = ['173.245.48.0/20', '10.20.30.0/24'];

async function render(ranges: readonly string[] = trusted): Promise<ComponentFixture<TryRequest>> {
  const fixture = TestBed.createComponent(TryRequest);
  fixture.componentRef.setInput('ranges', ranges);
  fixture.detectChanges();
  await settle(fixture);
  return fixture;
}

async function fillIn(fixture: ComponentFixture<TryRequest>, label: string, value: string): Promise<void> {
  type(byLabel(fixture, label), value);
  await settle(fixture);
}

function output(fixture: ComponentFixture<TryRequest>): string[] {
  return ['Client address', 'Scheme', 'X-Forwarded-For sent on'].map((term) => definitionOf(fixture, term));
}

describe('TryRequest', () => {
  it('starts with a request through two trusted proxies', async () => {
    const fixture = await render();

    expect(output(fixture)).toEqual(['198.51.100.23', 'https', '198.51.100.23, 10.20.30.4, 173.245.48.10']);
  });

  it('says it skipped a trusted address', async () => {
    const fixture = await render();

    expect(definitionOf(fixture, 'Why')).toBe(
      'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary skips 1 more trusted address and takes the first address it doesn’t trust.',
    );
  });

  it('says it skipped several trusted addresses', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-For received (optional)', '198.51.100.23, 10.20.30.5, 10.20.30.4');

    expect(definitionOf(fixture, 'Why')).toContain('skips 2 more trusted addresses');
  });

  it('says it took the last address when it isn’t trusted', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-For received (optional)', '198.51.100.23');

    expect(definitionOf(fixture, 'Why')).toBe(
      'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary takes the first address it doesn’t trust.',
    );
  });

  it('notes an X-Forwarded-Proto other than http or https', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-Proto received (optional)', 'wss');

    expect(definitionOf(fixture, 'Why')).toContain('X-Forwarded-Proto isn’t http or https, so it counts as http.');
  });

  it('explains a proxy that sent no X-Forwarded-For', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-For received (optional)', '');

    expect(definitionOf(fixture, 'Why')).toBe('The proxy sent no X-Forwarded-For, so Apiary uses the proxy’s own address.');
  });

  it('warns that it ignores an X-Forwarded-For with something that isn’t an address', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-For received (optional)', 'unknown');

    expect((fixture.nativeElement as HTMLElement).querySelector('dd .ap-status-warn')?.textContent).toContain('isn’t an address');
  });

  it('warns that it ignores an X-Forwarded-For with too many addresses', async () => {
    const fixture = await render();

    await fillIn(fixture, 'X-Forwarded-For received (optional)', Array.from({ length: 21 }, () => '198.51.100.23').join(','));

    expect(definitionOf(fixture, 'Why')).toBe(
      'X-Forwarded-For has more than 20 addresses, so Apiary ignores the headers and uses the proxy’s own address.',
    );
  });

  it('uses the address of a connection that isn’t from a trusted proxy', async () => {
    const fixture = await render([]);

    expect([...output(fixture), definitionOf(fixture, 'Why')]).toEqual([
      '173.245.48.10',
      'http',
      '173.245.48.10',
      'The connection isn’t from a trusted proxy, so Apiary ignores the headers it received and sends new ones.',
    ]);
  });

  it('explains an untrusted connection without headers', async () => {
    const fixture = await render([]);

    await fillIn(fixture, 'X-Forwarded-For received (optional)', '');
    await fillIn(fixture, 'X-Forwarded-Proto received (optional)', '');

    expect(definitionOf(fixture, 'Why')).toBe('The connection isn’t from a trusted proxy, so its own address is the client’s.');
  });

  it.each([
    ['', 'Enter the address the connection comes from.'],
    ['proxy', 'Enter an IPv4 or IPv6 address, such as 173.245.48.10.'],
  ])('asks for the connection’s address instead of %j', async (connection, hint) => {
    const fixture = await render();

    await fillIn(fixture, 'Connection from', connection);

    expect(textOf(fixture)).toContain(hint);
  });
});
