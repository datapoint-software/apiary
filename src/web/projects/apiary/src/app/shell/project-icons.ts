import type { IconNode } from 'lucide';
import {
  Archive,
  Boxes,
  Cloud,
  CreditCard,
  Database,
  FlaskConical,
  Folder,
  Globe,
  HeartPulse,
  Megaphone,
  Server,
  ShoppingBag,
  Wrench,
} from 'lucide';

export const projectIcons: Readonly<Record<string, IconNode>> = {
  folder: Folder,
  'shopping-bag': ShoppingBag,
  'credit-card': CreditCard,
  wrench: Wrench,
  archive: Archive,
  megaphone: Megaphone,
  globe: Globe,
  server: Server,
  database: Database,
  cloud: Cloud,
  boxes: Boxes,
  'flask-conical': FlaskConical,
  'heart-pulse': HeartPulse,
};

export function projectIcon(name: string): IconNode {
  return projectIcons[name] ?? Folder;
}
