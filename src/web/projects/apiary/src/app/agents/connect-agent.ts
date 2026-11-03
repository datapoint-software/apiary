import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiProblem, Banner, Button, ErrorMessages } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { AgentClientView } from '../api/models';
import { Auth } from '../auth/auth';
import { AuthPage } from '../auth/auth-page';
import { roleNames } from '../auth/roles';

interface ConnectedAgent {
  readonly id: string;
  readonly redirectTo: string;
}

@Component({
  selector: 'ap-connect-agent',
  imports: [AuthPage, Banner, Button],
  templateUrl: './connect-agent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectAgent {
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly request = {
    clientId: this.query.get('client_id') ?? '',
    redirectUri: this.query.get('redirect_uri') ?? '',
    codeChallenge: this.query.get('code_challenge') ?? '',
    codeChallengeMethod: this.query.get('code_challenge_method') ?? '',
    state: this.query.get('state'),
  };
  private readonly refused = this.query.get('error');
  private readonly api = inject(Api);
  private readonly messages = inject(ErrorMessages);
  protected readonly auth = inject(Auth);
  protected readonly client = httpResource<AgentClientView>(() =>
    this.api.query('agents.client', { clientId: this.request.clientId, redirectUri: this.request.redirectUri }),
  );
  protected readonly loadError = computed(() => {
    if (this.refused) {
      return this.messages.describe(this.refused);
    }

    const error = this.client.error() as { error?: ApiProblem } | undefined;
    return error ? this.messages.describe(error.error?.code ?? 'agent.clientUnknown') : '';
  });
  protected readonly role = computed(() => {
    const role = this.auth.user()?.role;
    return role ? roleNames[role] : '';
  });
  protected readonly working = signal(false);
  protected readonly failure = signal('');

  protected async approve(): Promise<void> {
    this.working.set(true);
    this.failure.set('');
    try {
      const connected = await this.api.send<ConnectedAgent>('agents.connect', this.request);
      const target = new URL(connected.redirectTo);
      target.searchParams.set('iss', location.origin);
      location.assign(target.toString());
    } catch (problem) {
      this.failure.set(this.messages.describe((problem as ApiProblem).code ?? 'internal'));
      this.working.set(false);
    }
  }

  protected deny(): void {
    const target = new URL(this.client.value()?.redirectUri ?? '/', location.origin);
    target.searchParams.set('error', 'access_denied');
    if (this.request.state) {
      target.searchParams.set('state', this.request.state);
    }
    target.searchParams.set('iss', location.origin);
    location.assign(target.toString());
  }
}
