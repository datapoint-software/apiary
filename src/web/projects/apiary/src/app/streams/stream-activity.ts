import { I18n, Tone } from '@datapoint/apiary-ui';
import { StreamRouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';

export interface StreamActivity {
  readonly tone: Tone;
  readonly text: string;
}

const quietAfter = 60 * 60_000;

export function streamActivity(stream: StreamRouteView, i18n: I18n, now = Date.now()): StreamActivity {
  if (stream.disabled) {
    return { tone: 'off', text: i18n.t('Disabled') };
  }
  if (stream.connections > 0) {
    return { tone: 'ok', text: i18n.t('Active') };
  }
  if (!stream.lastConnectionAt) {
    return { tone: 'info', text: i18n.t('No connections yet') };
  }
  if (now - Date.parse(stream.lastConnectionAt) < quietAfter) {
    return { tone: 'ok', text: i18n.t('Active') };
  }
  return { tone: 'warn', text: i18n.t('Last connection {ago}', { ago: timeAgo(stream.lastConnectionAt, now) }) };
}
