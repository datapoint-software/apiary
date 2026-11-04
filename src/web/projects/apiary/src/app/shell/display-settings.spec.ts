import { TestBed } from '@angular/core/testing';
import { DisplaySettings, displayChoices } from './display-settings';

const [theme, text] = displayChoices;
const root = document.documentElement;

function setUp(): DisplaySettings {
  const settings = TestBed.inject(DisplaySettings);
  TestBed.tick();
  return settings;
}

describe('DisplaySettings', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    ['theme', 'text', 'contrast', 'motion'].forEach((s) => root.removeAttribute(`data-${s}`));
  });

  it('starts light, with the other settings left to the device', () => {
    const settings = setUp();

    expect(displayChoices.map((choice) => settings.value(choice))).toEqual([
      'light',
      'default',
      'system',
      'system',
    ]);
  });

  it('marks the page with the settings that differ from the device', () => {
    setUp();

    expect([root.getAttribute('data-theme'), root.hasAttribute('data-text')]).toEqual([
      'light',
      false,
    ]);
  });

  it('applies and remembers a setting', () => {
    const settings = setUp();

    settings.set('text', 'larger');
    TestBed.tick();

    expect([root.getAttribute('data-text'), localStorage.getItem('apiary.display')]).toEqual([
      'larger',
      '{"text":"larger"}',
    ]);
  });

  it('removes the mark once a setting follows the device again', () => {
    const settings = setUp();

    settings.set('theme', 'system');
    TestBed.tick();

    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('reads the settings remembered in this browser', () => {
    localStorage.setItem('apiary.display', '{"theme":"dark"}');

    const settings = setUp();

    expect(settings.value(theme)).toBe('dark');
  });

  it.each(['not json', 'null'])('ignores remembered settings it can’t read: %s', (stored) => {
    localStorage.setItem('apiary.display', stored);

    const settings = setUp();

    expect(settings.value(text)).toBe('default');
  });
});
