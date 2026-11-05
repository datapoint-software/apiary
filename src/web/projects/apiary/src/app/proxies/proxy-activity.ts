import { TrustedProxyView } from '../api/models';

const quietAfter = 24 * 60 * 60_000;

export function isQuiet(proxy: TrustedProxyView, now = Date.now()): boolean {
  return proxy.lastRequestAt === null || now - Date.parse(proxy.lastRequestAt) > quietAfter;
}
