import { ForwardedHeaders, resolveRequest } from './forwarded-request';

const cdn = '173.245.48.0/20';
const loadBalancer = '10.20.30.0/24';
const trusted = [cdn, loadBalancer];

function request(overrides: Partial<ForwardedHeaders> = {}): ForwardedHeaders {
  return { connection: '173.245.48.10', forwardedFor: '198.51.100.23', forwardedProto: 'https', ...overrides };
}

function addresses(count: number): string {
  return [...Array(count).keys()].map((i) => `198.51.100.${i + 1}`).join(', ');
}

describe('resolveRequest', () => {
  it.each(['', 'unknown', '173.245.48.10:443'])('needs the connection’s address, not %j', (connection) => {
    expect(resolveRequest(request({ connection }), trusted)).toBeNull();
  });

  it('uses the connection’s own address when it isn’t from a trusted proxy', () => {
    expect(resolveRequest(request({ connection: '203.0.113.9' }), trusted)).toEqual({
      client: '203.0.113.9',
      scheme: 'http',
      sentFor: '203.0.113.9',
      reason: 'untrustedWithHeaders',
      skipped: 0,
      ignoredProto: false,
    });
  });

  it('says nothing about headers an untrusted connection didn’t send', () => {
    const resolved = resolveRequest({ connection: '203.0.113.9', forwardedFor: ' , ', forwardedProto: '' }, trusted);

    expect(resolved?.reason).toBe('untrusted');
  });

  it('takes the client from X-Forwarded-For of a trusted proxy', () => {
    expect(resolveRequest(request(), trusted)).toEqual({
      client: '198.51.100.23',
      scheme: 'https',
      sentFor: '198.51.100.23, 173.245.48.10',
      reason: 'trustedChain',
      skipped: 0,
      ignoredProto: false,
    });
  });

  it('skips trusted addresses from the right', () => {
    const resolved = resolveRequest(request({ connection: '10.20.30.4', forwardedFor: '203.0.113.9, 198.51.100.23, 173.245.48.10' }), trusted);

    expect([resolved?.client, resolved?.skipped]).toEqual(['198.51.100.23', 1]);
  });

  it('stops at the first address even when every address is trusted', () => {
    const resolved = resolveRequest(request({ forwardedFor: '10.20.30.5, 10.20.30.6' }), trusted);

    expect([resolved?.client, resolved?.skipped]).toEqual(['10.20.30.5', 1]);
  });

  it('sends on the addresses it received and the proxy’s address', () => {
    const resolved = resolveRequest(request({ forwardedFor: ' 203.0.113.9:51234 ,, 198.51.100.23 ' }), trusted);

    expect(resolved?.sentFor).toBe('203.0.113.9:51234, 198.51.100.23, 173.245.48.10');
  });

  it('reads an address with a port', () => {
    const resolved = resolveRequest(request({ forwardedFor: '[2001:db8::1]:51234' }), trusted);

    expect(resolved?.client).toBe('2001:db8::1');
  });

  it('trusts a proxy whose address is IPv4 mapped into IPv6', () => {
    const resolved = resolveRequest(request({ connection: '::ffff:10.20.30.4' }), trusted);

    expect([resolved?.client, resolved?.sentFor]).toEqual(['198.51.100.23', '198.51.100.23, 10.20.30.4']);
  });

  it('skips a trusted address mapped into IPv6', () => {
    const resolved = resolveRequest(request({ forwardedFor: '198.51.100.23, ::ffff:10.20.30.9' }), trusted);

    expect(resolved?.client).toBe('198.51.100.23');
  });

  it('ignores the headers when X-Forwarded-For has something that isn’t an address', () => {
    expect(resolveRequest(request({ forwardedFor: '198.51.100.23, unknown' }), trusted)).toEqual({
      client: '173.245.48.10',
      scheme: 'http',
      sentFor: '173.245.48.10',
      reason: 'notAnAddress',
      skipped: 0,
      ignoredProto: false,
    });
  });

  it('accepts 20 addresses', () => {
    expect(resolveRequest(request({ forwardedFor: addresses(20) }), trusted)?.reason).toBe('trustedChain');
  });

  it('ignores the headers when X-Forwarded-For has more than 20 addresses', () => {
    const resolved = resolveRequest(request({ forwardedFor: addresses(21) }), trusted);

    expect([resolved?.reason, resolved?.client]).toEqual(['tooManyAddresses', '173.245.48.10']);
  });

  it('uses the proxy’s address when it sends no X-Forwarded-For', () => {
    expect(resolveRequest(request({ forwardedFor: '' }), trusted)).toEqual({
      client: '173.245.48.10',
      scheme: 'https',
      sentFor: '173.245.48.10',
      reason: 'noForwardedFor',
      skipped: 0,
      ignoredProto: false,
    });
  });

  it('takes the only X-Forwarded-Proto value, whichever the hop', () => {
    const resolved = resolveRequest(request({ connection: '10.20.30.4', forwardedFor: '198.51.100.23, 173.245.48.10', forwardedProto: 'HTTPS' }), trusted);

    expect(resolved?.scheme).toBe('https');
  });

  it('takes the X-Forwarded-Proto value of the same hop', () => {
    const resolved = resolveRequest(
      request({ connection: '10.20.30.4', forwardedFor: '198.51.100.23, 173.245.48.10', forwardedProto: 'https, http' }),
      trusted,
    );

    expect(resolved?.scheme).toBe('https');
  });

  it('uses the connection’s scheme when the hop has no X-Forwarded-Proto value', () => {
    const resolved = resolveRequest(
      request({ connection: '10.20.30.4', forwardedFor: '203.0.113.9, 173.245.48.1, 173.245.48.10', forwardedProto: 'https, https' }),
      trusted,
    );

    expect([resolved?.scheme, resolved?.ignoredProto]).toEqual(['http', false]);
  });

  it('counts an X-Forwarded-Proto other than http or https as http', () => {
    const resolved = resolveRequest(request({ forwardedProto: 'wss' }), trusted);

    expect([resolved?.scheme, resolved?.ignoredProto]).toEqual(['http', true]);
  });

  it('reads X-Forwarded-Proto when the proxy sends no X-Forwarded-For', () => {
    const resolved = resolveRequest(request({ forwardedFor: '', forwardedProto: 'ftp' }), trusted);

    expect([resolved?.scheme, resolved?.ignoredProto]).toEqual(['http', true]);
  });

  it('skips ranges it can’t read', () => {
    expect(resolveRequest(request(), ['office'])?.reason).toBe('untrustedWithHeaders');
  });
});
