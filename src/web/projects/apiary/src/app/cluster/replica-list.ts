import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormField, disabled, form } from '@angular/forms/signals';
import {
  ApiProblem,
  Button,
  Confirmer,
  ErrorSummary,
  Field,
  Form,
  I18n,
  PageHead,
  Status,
  Toaster,
  Tone,
  TranslatePipe,
  problemErrors,
  wholeNumber,
} from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { MemberView, MembershipMode } from '../api/models';
import { timeAgo, timeSince } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { ClusterStatus } from './cluster-status';
import { PendingReplicas } from './pending-replicas';
import { RecoveryDialog } from './recovery-dialog';
import { openDialog } from '../shell/open-dialog';
import { WriteLock } from './write-lock';

const roles = { leader: 'Leader', voter: 'Voter', joining: 'Joining' } as const;

interface MembershipModel {
  mode: MembershipMode;
  removeMissingAfterMinutes: number | null;
}

@Component({
  selector: 'ap-replica-list',
  imports: [
    PageHead,
    Status,
    Button,
    Form,
    Field,
    FormField,
    ErrorSummary,
    WriteLock,
    PendingReplicas,
    TranslatePipe,
  ],
  templateUrl: './replica-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplicaList {
  private readonly api = inject(Api);
  private readonly confirmer = inject(Confirmer);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly i18n = inject(I18n);
  protected readonly cluster = inject(ClusterStatus);
  protected readonly roles = roles;
  protected readonly timeAgo = timeAgo;
  protected readonly isSwarm = computed(() => this.cluster.view()?.mode === 'Swarm');
  protected readonly members = computed(() =>
    [...(this.cluster.view()?.members ?? [])].sort((a, b) =>
      (a.node ?? a.address).localeCompare(b.node ?? b.address),
    ),
  );
  protected readonly auth = inject(Auth);
  private readonly model = signal<MembershipModel>({
    mode: 'automatic',
    removeMissingAfterMinutes: 15,
  });
  protected readonly membership = form(this.model, (m) => {
    disabled(m, () => !this.auth.canAdminister());
    wholeNumber(m.removeMissingAfterMinutes, 5, 1440);
  });

  constructor() {
    effect(() => {
      const settings = this.cluster.view()?.membership;
      if (settings && !this.membership().dirty()) {
        this.model.set({
          mode: settings.mode,
          removeMissingAfterMinutes: Math.max(5, settings.removeMissingAfterMinutes),
        });
      }
    });
  }

  protected status(member: MemberView): [Tone, string] {
    if (!member.reachable) {
      return [
        'critical',
        member.missingSince
          ? this.i18n.t('Missing for {time}', { time: timeSince(member.missingSince) })
          : this.i18n.t('Unreachable'),
      ];
    }
    if (member.role === 'joining') {
      return ['info', this.i18n.t('Catching up')];
    }
    return ['ok', this.i18n.t('In sync')];
  }

  protected async save(apForm: Form): Promise<void> {
    const value = this.model();
    const saved = await apForm.submit(async () => {
      try {
        await this.api.send('cluster.update-membership', value);
        return undefined;
      } catch (problem) {
        return problemErrors(problem as ApiProblem, this.membership);
      }
    });
    if (saved) {
      this.membership().reset();
      this.cluster.reload();
      this.toaster.show(
        value.mode === 'manual'
          ? this.i18n.t(
              'New replicas now wait for your approval, and missing ones stay until you remove them.',
            )
          : this.i18n.t(
              'New replicas join on their own, and missing ones are removed after {minutes} minutes.',
              { minutes: value.removeMissingAfterMinutes ?? '' },
            ),
        { heading: this.i18n.t('Membership saved') },
      );
    }
  }

  protected async recover(): Promise<void> {
    await openDialog<void, null>(this.dialog, RecoveryDialog, null);
  }

  protected async remove(member: MemberView): Promise<void> {
    const node = member.node ?? member.address;
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Remove {node} now?', { node }),
      text: this.i18n.t(
        '{later} Once removed, it no longer counts towards the majority. If {node} comes back, its replica joins again as a new replica.',
        { later: this.missing(member), node },
      ),
      confirm: this.i18n.t('Remove replica'),
      busy: this.i18n.t('Removing…'),
      tone: 'danger',
      action: async () => {
        await this.api.send('cluster.remove-replica', { id: member.id });
      },
    });
    this.cluster.reload();
    if (done) {
      this.toaster.show(this.i18n.t('{node} was removed from the cluster.', { node }));
    }
  }

  private missing(member: MemberView): string {
    const settings = this.cluster.view()?.membership;
    const params = {
      time: member.missingSince ? timeSince(member.missingSince) : '',
      minutes: settings?.removeMissingAfterMinutes ?? 0,
    };
    if (settings?.mode === 'automatic') {
      return member.missingSince
        ? this.i18n.t(
            'It has been missing for {time}, and would be removed on its own after {minutes} minutes.',
            params,
          )
        : this.i18n.t(
            'It can’t be reached, and would be removed on its own after {minutes} minutes.',
            params,
          );
    }
    return member.missingSince
      ? this.i18n.t('It has been missing for {time}.', params)
      : this.i18n.t('It can’t be reached.');
  }
}
