import type { IconNode } from 'lucide';

export interface NavItem {
  readonly icon: IconNode;
  readonly label: string;
  readonly link: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly count?: number;
  readonly warn?: boolean;
}

export interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}
