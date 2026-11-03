import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { EmptyState, Icon, PageHead } from '@datapoint/apiary-ui';
import { Search } from 'lucide';
import { Api } from '../api/api';
import { AuditEntry } from '../api/models';
import { actionLabel } from './action-labels';
import { AuditRange, CustomRange } from './custom-range';

type Range = '24h' | '7d' | '30d' | '365d' | 'custom';
type Via = '' | 'people' | 'agents' | 'system';

const hours: Record<Exclude<Range, 'custom'>, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, '365d': 24 * 365 };

interface Day {
  readonly title: string;
  readonly entries: readonly AuditEntry[];
}

@Component({
  selector: 'ap-audit-log',
  imports: [PageHead, EmptyState, Icon, CustomRange],
  templateUrl: './audit-log.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLog {
  private readonly api = inject(Api);
  protected readonly ranges: readonly [Range, string][] = [
    ['24h', 'Last 24 h'],
    ['7d', '7 days'],
    ['30d', '30 days'],
    ['365d', '1 year'],
    ['custom', 'Custom…'],
  ];
  protected readonly vias: readonly [Via, string][] = [
    ['', 'All'],
    ['people', 'People'],
    ['agents', 'Agents'],
    ['system', 'System'],
  ];
  protected readonly searchIcon = Search;
  protected readonly via = signal<Via>('');
  protected readonly search = signal('');
  protected readonly custom = signal<AuditRange | null>(null);
  private searchTimer?: ReturnType<typeof setTimeout>;
  protected readonly range = signal<Range>('7d');
  protected readonly who = signal('');
  protected readonly failedOnly = signal(false);
  protected readonly actionLabel = actionLabel;
  protected readonly byAgent = (entry: AuditEntry) => !!entry.user && !!entry.client;

  protected readonly entries = httpResource<AuditEntry[]>(
    () =>
      this.api.query('audit.list', {
        ...this.span(),
        user: this.who() || null,
        failedOnly: this.failedOnly(),
        via: this.via() || null,
        search: this.search() || null,
      }),
    { defaultValue: [] },
  );
  private readonly everyone = httpResource<AuditEntry[]>(() => this.api.query('audit.list', {}), { defaultValue: [] });
  protected readonly people = computed(() =>
    [...new Set(this.everyone.value().map((e) => e.user).filter((u): u is string => !!u))].sort((a, b) => a.localeCompare(b)),
  );

  protected readonly days = computed<readonly Day[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const groups = new Map<string, AuditEntry[]>();
    for (const entry of this.entries.value()) {
      const day = entry.at.slice(0, 10);
      groups.set(day, [...(groups.get(day) ?? []), entry]);
    }
    const names = new Map([
      [today, 'Today'],
      [yesterday, 'Yesterday'],
    ]);
    return [...groups].map(([day, entries]) => ({ title: names.get(day) ?? day, entries }));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected type(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search.set(text.trim()), 300);
  }

  protected reset(): void {
    this.range.set('7d');
    this.who.set('');
    this.failedOnly.set(false);
    this.via.set('');
    this.search.set('');
    this.custom.set(null);
  }

  private span(): { from: string | null; to: string | null } {
    const range = this.range();
    if (range !== 'custom') {
      return { from: new Date(Date.now() - hours[range] * 3_600_000).toISOString(), to: null };
    }
    const custom = this.custom();
    return custom
      ? { from: new Date(custom.from).toISOString(), to: new Date(custom.to).toISOString() }
      : { from: new Date(Date.now() - hours['7d'] * 3_600_000).toISOString(), to: null };
  }
}
