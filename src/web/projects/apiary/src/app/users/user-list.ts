import { Dialog } from '@angular/cdk/dialog';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Banner, Button, Confirmer, ErrorMessages, I18n, Icon, PageHead, Status, Toaster, TranslatePipe } from '@datapoint/apiary-ui';
import { Ellipsis, Link, Smartphone, Trash2, UserCheck, UserCog, UserPlus, UserX, X } from 'lucide';
import { Api } from '../api/api';
import { InviteLink, Role, UserView } from '../api/models';
import { timeAgo, timeUntil } from '../api/time-ago';
import { Auth } from '../auth/auth';
import { roleDescriptions, roleNames } from '../auth/roles';
import { openDialog } from '../shell/open-dialog';
import { InviteDialog } from './invite-dialog';
import { InviteLinkData, InviteLinkDialog } from './invite-link-dialog';
import { RoleDialog } from './role-dialog';
import { SessionPolicyPanel } from './session-policy-panel';
import { WriteLock } from '../cluster/write-lock';

@Component({
  selector: 'ap-user-list',
  imports: [WriteLock, SessionPolicyPanel, PageHead, Button, Icon, Banner, Status, CdkMenu, CdkMenuItem, CdkMenuTrigger, TranslatePipe],
  templateUrl: './user-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly messages = inject(ErrorMessages);
  private readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly users = httpResource<UserView[]>(() => this.api.query('users.list'), { defaultValue: [] });
  protected readonly withoutTwoStep = computed(() => this.users.value().filter((u) => u.status === 'active' && !u.twoStepOn && !u.singleSignOn).length);
  protected readonly withoutTwoStepHeading = computed(() =>
    this.i18n.plural(this.withoutTwoStep(), '{count} person must set up two-step sign-in', '{count} people must set up two-step sign-in'),
  );
  protected readonly roleNames = roleNames;
  protected readonly roles = Object.entries(roleDescriptions) as [Role, string][];
  protected readonly timeAgo = timeAgo;

  protected tags(user: UserView): readonly string[] {
    return [
      ...(user.id === this.auth.user()?.id ? ['You'] : []),
      ...(user.singleSignOn ? ['Single sign-on'] : []),
    ];
  }

  protected twoStep(user: UserView): readonly ['ok' | 'warn' | undefined, string] {
    if (user.status === 'invited') {
      return [undefined, '–'];
    }
    if (user.singleSignOn) {
      return [undefined, 'At the identity provider'];
    }
    return user.twoStepOn ? ['ok', 'On'] : ['warn', 'Not set up'];
  }
  protected readonly timeUntil = timeUntil;
  protected readonly icons = {
    invite: UserPlus,
    menu: Ellipsis,
    role: UserCog,
    reset: Smartphone,
    disable: UserX,
    enable: UserCheck,
    delete: Trash2,
    link: Link,
    revoke: X,
  };

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected async invite(): Promise<void> {
    const result = await openDialog<{ link: InviteLink; email: string; name: string }, null>(this.dialog, InviteDialog, null);
    if (result) {
      await this.showLink(this.i18n.t('Invite {name}', { name: result.name }), result.email, result.link, false);
    }
  }

  protected async renew(user: UserView): Promise<void> {
    try {
      const link = await this.api.send<InviteLink>('users.renew-invite', { id: user.id });
      await this.showLink(this.i18n.t('New invite link'), user.email, link, true);
    } catch (problem) {
      this.fail(problem);
    }
  }

  protected async changeRole(user: UserView): Promise<void> {
    const role = await openDialog<Role, UserView>(this.dialog, RoleDialog, user);
    if (role) {
      const text = role === 'viewer' ? '{name} is now a {role}. It applies at their next request.' : '{name} is now an {role}. It applies at their next request.';
      this.toaster.show(this.i18n.t(text, { name: user.name, role: this.i18n.t(roleNames[role]) }));
    }
  }

  protected async resetTwoStep(user: UserView): Promise<void> {
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Reset two-step sign-in for {name}?', { name: user.name }),
      text: this.i18n.t(
        'Use this when they lost their phone. They’re signed out everywhere, their agents are disconnected, and they set it up again at their next sign-in. Check it’s really them first.',
      ),
      confirm: this.i18n.t('Reset two-step sign-in'),
      busy: this.i18n.t('Resetting…'),
      action: () => this.api.send('users.reset-two-step', { id: user.id }),
    });
    if (done) {
      this.toaster.show(this.i18n.t('{name} sets up two-step sign-in at their next sign-in.', { name: user.name }));
    }
  }

  protected async disable(user: UserView): Promise<void> {
    const done = await this.confirmer.confirm({
      heading: this.i18n.t('Disable {name}?', { name: user.name }),
      text: this.i18n.t('They’re signed out everywhere and can’t sign in. Their history stays in the audit log.'),
      confirm: this.i18n.t('Disable user'),
      busy: this.i18n.t('Disabling…'),
      action: () => this.api.send('users.disable', { id: user.id }),
    });
    if (done) {
      this.toaster.show(this.i18n.t('{name} disabled.', { name: user.name }));
    }
  }

  protected async enable(user: UserView): Promise<void> {
    try {
      await this.api.send('users.enable', { id: user.id });
      this.toaster.show(this.i18n.t('{name} can sign in again.', { name: user.name }));
    } catch (problem) {
      this.fail(problem);
    }
  }

  protected async delete(user: UserView): Promise<void> {
    const invited = user.status === 'invited';
    const done = await this.confirmer.confirm({
      heading: invited ? this.i18n.t('Revoke the invite for {email}?', { email: user.email }) : this.i18n.t('Delete {name}?', { name: user.name }),
      text: this.i18n.t(
        invited
          ? 'The link stops working at once.'
          : 'Their account is deleted and they’re signed out everywhere. The audit log keeps their actions, under their email address, until the entries expire.',
      ),
      confirm: this.i18n.t(invited ? 'Revoke invite' : 'Delete user'),
      busy: this.i18n.t(invited ? 'Revoking…' : 'Deleting…'),
      typeToConfirm: invited ? undefined : user.email,
      action: () => this.api.send('users.delete', { id: user.id }),
    });
    if (done) {
      this.toaster.show(invited ? this.i18n.t('Invite revoked.') : this.i18n.t('{name} deleted.', { name: user.name }));
    }
  }

  private async showLink(heading: string, email: string, link: InviteLink, renewed: boolean): Promise<void> {
    const url = `${location.origin}/invite/${link.token}`;
    await openDialog<void, InviteLinkData>(this.dialog, InviteLinkDialog, { heading, email, url, renewed });
  }

  private fail(problem: unknown): void {
    const code = (problem as { code?: string }).code ?? 'internal';
    this.toaster.show(this.messages.describe(code), { tone: 'error' });
  }
}
