import { DOCUMENT, Service, effect, inject, signal } from '@angular/core';

export type DisplaySetting = 'theme' | 'text' | 'contrast' | 'motion';

export interface DisplayChoice {
  readonly setting: DisplaySetting;
  readonly label: string;
  readonly options: readonly (readonly [value: string, label: string])[];
}

export const displayChoices: readonly DisplayChoice[] = [
  { setting: 'theme', label: 'Appearance', options: [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']] },
  { setting: 'text', label: 'Text size', options: [['default', 'Default'], ['large', 'Large'], ['larger', 'Larger']] },
  { setting: 'contrast', label: 'Contrast', options: [['system', 'Automatic'], ['standard', 'Standard'], ['more', 'More']] },
  { setting: 'motion', label: 'Motion', options: [['system', 'Automatic'], ['standard', 'Standard'], ['reduce', 'Reduced']] },
];

type Preferences = Partial<Record<DisplaySetting, string>>;

const key = 'apiary.display';

function read(): Preferences {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    return typeof stored === 'object' && stored !== null ? (stored as Preferences) : {};
  } catch {
    return {};
  }
}

function save(preferences: Preferences): void {
  try {
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    return;
  }
}

function isDefault(value: string | undefined): value is undefined | 'system' | 'default' {
  return !value || value === 'system' || value === 'default';
}

@Service()
export class DisplaySettings {
  private readonly root = inject(DOCUMENT).documentElement;
  readonly preferences = signal<Preferences>(read());

  constructor() {
    effect(() => {
      const preferences = this.preferences();
      for (const { setting } of displayChoices) {
        const value = preferences[setting];
        if (isDefault(value)) {
          this.root.removeAttribute(`data-${setting}`);
        } else {
          this.root.setAttribute(`data-${setting}`, value);
        }
      }
    });
  }

  value(choice: DisplayChoice): string {
    return this.preferences()[choice.setting] ?? choice.options[0][0];
  }

  set(setting: DisplaySetting, value: string): void {
    this.preferences.update((preferences) => ({ ...preferences, [setting]: value }));
    save(this.preferences());
  }
}
