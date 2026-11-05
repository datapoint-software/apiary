import { readonly, required, schema, validate } from '@angular/forms/signals';
import { hostname } from '@datapoint/apiary-ui';
import { serverCheck } from '../api/server-check';

export interface RedirectModel {
  projectId: string;
  from: string;
  path: string;
  to: string;
  statusCode: string;
  keepPath: boolean;
}

export const wholeHost = '/';
const acmeChallenges = '/.well-known/acme-challenge';

export function redirectPath(path: string): string {
  const trimmed = path.trim();
  return !trimmed || trimmed === wholeHost ? wholeHost : trimmed.replace(/\/+$/, '');
}

export function redirectLabel(redirect: { readonly from: string; readonly path: string }): string {
  return redirect.path === wholeHost ? redirect.from : redirect.from + redirect.path;
}

export function isUnder(path: string, prefix: string): boolean {
  const lower = path.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();
  return prefix === wholeHost || lower === lowerPrefix || lower.startsWith(lowerPrefix + '/');
}

export function isRelative(to: string): boolean {
  const trimmed = to.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !/[\\#\s]/.test(trimmed);
}

function absolute(to: string): URL | undefined {
  try {
    const url = new URL(to.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.hash ? url : undefined;
  } catch {
    return undefined;
  }
}

export function pathError(path: string): string | undefined {
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!trimmed.startsWith('/') || /[?#\s]|\.\.|\/\//.test(trimmed)) {
    return 'path.invalid';
  }
  const normalized = redirectPath(trimmed);
  const isReserved =
    normalized !== wholeHost &&
    (isUnder(normalized, acmeChallenges) || isUnder(acmeChallenges, normalized));
  return isReserved ? 'redirect.pathReserved' : undefined;
}

export function targetError(to: string, from: string, path: string): string | undefined {
  const prefix = redirectPath(path);
  if (isRelative(to)) {
    if (prefix === wholeHost) {
      return 'redirect.relativeNeedsPath';
    }
    return isUnder(redirectPath(to.trim().split('?')[0]), prefix) ? 'redirect.loop' : undefined;
  }
  const url = absolute(to);
  if (!url) {
    return 'redirect.targetInvalid';
  }
  const isSameHost = url.hostname === from.trim().toLowerCase();
  return isSameHost && isUnder(redirectPath(url.pathname), prefix) ? 'redirect.loop' : undefined;
}

export function redirectExample(
  model: RedirectModel,
): { readonly from: string; readonly to: string } | undefined {
  const from = model.from.trim().toLowerCase();
  const to = model.to.trim();
  if (!from || !to || targetError(to, from, model.path)) {
    return undefined;
  }
  const prefix = redirectPath(model.path);
  const sample = prefix === wholeHost ? '/shoes' : prefix + '/2026';
  const query = model.keepPath ? '?ref=mail' : '';
  const kept = model.keepPath
    ? to.replace(/\/+$/, '') + sample.slice(prefix === wholeHost ? 0 : prefix.length) + query
    : to;
  return { from: from + sample + query, to: isRelative(to) ? from + kept : kept };
}

export const redirectRules = (fixedHost: boolean) =>
  schema<RedirectModel>((redirect) => {
    readonly(redirect.from, () => fixedHost);
    required(redirect.projectId, { error: { kind: 'project.notFound' } });
    hostname(redirect.from);
    serverCheck(redirect.from, 'redirects.check', ['from'], ({ value, valueOf }) => ({
      from: value(),
      path: valueOf(redirect.path) || null,
    }));
    serverCheck(redirect.path, 'redirects.check', ['path'], ({ value, valueOf }) => ({
      from: valueOf(redirect.from),
      path: value(),
    }));
    required(redirect.path, { when: () => fixedHost, error: { kind: 'path.invalid' } });
    validate(redirect.path, ({ value }) => {
      const kind = pathError(value());
      return kind ? { kind } : undefined;
    });
    required(redirect.to, { error: { kind: 'redirect.targetInvalid' } });
    validate(redirect.to, ({ value, valueOf }) => {
      const kind = value().trim()
        ? targetError(value(), valueOf(redirect.from), valueOf(redirect.path))
        : undefined;
      return kind ? { kind } : undefined;
    });
  });
