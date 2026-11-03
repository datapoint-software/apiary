import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { Button, Field, Icon } from '@datapoint/apiary-ui';
import { Plus, X } from 'lucide';
import { RouteModel } from './route-model';

const maximumTargets = 10;

@Component({
  selector: 'ap-targets-section',
  imports: [Field, FormField, Button, Icon],
  templateUrl: './targets-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetsSection {
  readonly route = input.required<FieldTree<RouteModel>>();
  protected readonly icons = { add: Plus, remove: X };
  private readonly model = computed(() => this.route()().value());
  protected readonly many = computed(() => this.model().targets.length > 1);
  protected readonly canAdd = computed(() => this.model().targets.length < maximumTargets);
  protected readonly canary = computed(() => this.many() && this.model().canary.source !== 'none');
  protected readonly lastTarget = computed(() => this.model().targets.at(-1)?.host || 'the last target');
  protected readonly split = computed(() =>
    this.model()
      .targets.map((t) => `${t.host || 'target'} ${t.weight ?? 0}%`)
      .join(' · '),
  );

  protected add(): void {
    this.route()().value.update((m) => {
      const targets = m.targets.length === 1 && m.targets[0].weight === 100
        ? [{ ...m.targets[0], weight: 90 }, { host: '', port: m.targets[0].port, weight: 10 }]
        : [...m.targets, { host: '', port: m.targets[0].port, weight: 0 }];
      return { ...m, targets };
    });
  }

  protected remove(index: number): void {
    this.route()().value.update((m) => {
      const targets = [...m.targets.slice(0, index), ...m.targets.slice(index + 1)];
      return { ...m, targets: targets.length === 1 ? [{ ...targets[0], weight: 100 }] : targets };
    });
  }
}
