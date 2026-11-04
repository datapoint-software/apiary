import { readCollapsed, saveCollapsed } from './sidebar-preference';

describe('sidebar preference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts expanded', () => {
    expect(readCollapsed()).toBe(false);
  });

  it('remembers a collapsed sidebar', () => {
    saveCollapsed(true);

    expect(readCollapsed()).toBe(true);
  });

  it('starts expanded when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(readCollapsed()).toBe(false);
  });

  it('carries on when the browser refuses to save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => saveCollapsed(true)).not.toThrow();
  });
});
