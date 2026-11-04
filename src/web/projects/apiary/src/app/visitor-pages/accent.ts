const white = '#FFFFFF';
const black = '#111111';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first: string, second: string): number {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

export function isAccent(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export function textOn(accent: string): string {
  return contrast(accent, white) >= contrast(accent, black) ? white : black;
}
