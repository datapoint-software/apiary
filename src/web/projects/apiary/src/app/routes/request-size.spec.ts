import { formatSize, sizeModel, toMegabytes } from './request-size';

describe('toMegabytes', () => {
  it('counts a gigabyte as 1000 megabytes', () => {
    expect(toMegabytes({ amount: 5, unit: 'GB' })).toBe(5000);
  });

  it('keeps megabytes as they are', () => {
    expect(toMegabytes({ amount: 30, unit: 'MB' })).toBe(30);
  });

  it('is null when no amount is given', () => {
    expect(toMegabytes({ amount: null, unit: 'GB' })).toBeNull();
  });
});

describe('sizeModel', () => {
  it('shows whole gigabytes in GB', () => {
    expect(sizeModel(10000)).toEqual({ amount: 10, unit: 'GB' });
  });

  it('shows anything else in MB', () => {
    expect(sizeModel(1500)).toEqual({ amount: 1500, unit: 'MB' });
    expect(sizeModel(30)).toEqual({ amount: 30, unit: 'MB' });
  });
});

describe('formatSize', () => {
  it('names the unit', () => {
    expect(formatSize(30)).toBe('30 MB');
    expect(formatSize(5000)).toBe('5 GB');
  });
});
