import { I18n } from '@datapoint/apiary-ui';

export function dateRangeWords(i18n: I18n): readonly string[] {
  return i18n.t('{start} to {end} UTC').split(/\{start\}|\{end\}/);
}
