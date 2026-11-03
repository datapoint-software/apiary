import { Tone } from '@datapoint/apiary-ui';
import { StreamRouteView } from '../api/models';
import { timeAgo } from '../api/time-ago';

export interface StreamActivity {
  readonly tone: Tone;
  readonly text: string;
}

const quietAfter = 60 * 60_000;

export function streamActivity(stream: StreamRouteView, now = Date.now()): StreamActivity {
  if (stream.disabled) {
    return { tone: 'off', text: 'Disabled' };
  }
  if (stream.connections > 0) {
    return { tone: 'ok', text: 'Active' };
  }
  if (!stream.lastConnectionAt) {
    return { tone: 'info', text: 'No connections yet' };
  }
  if (now - Date.parse(stream.lastConnectionAt) < quietAfter) {
    return { tone: 'ok', text: 'Active' };
  }
  return { tone: 'warn', text: `Last connection ${timeAgo(stream.lastConnectionAt, now)}` };
}
