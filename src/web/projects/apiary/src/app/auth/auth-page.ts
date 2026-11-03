import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatapointLogo } from '../shell/datapoint-logo';

@Component({
  selector: 'ap-auth-page',
  imports: [DatapointLogo],
  template: `
    <main class="ap-auth" id="main">
      <div class="ap-panel ap-auth-card" [style.width]="wide() ? 'min(460px, 100%)' : null">
        <div class="ap-auth-brand">
          <span class="ap-brand-mark" aria-hidden="true"></span>
          <div>
            <h1 class="ap-h ap-h-2">{{ heading() }}</h1>
            @if (sub()) {
              <p class="ap-muted" style="margin: 4px 0 0; font-size: 0.875rem">{{ sub() }}</p>
            }
          </div>
        </div>
        <ng-content />
      </div>
      <div class="ap-attribution">
        <span style="color: var(--ink-2)"><ap-datapoint-logo /></span>
        <span>Based on Apiary by <a href="https://datapoint.software/">Datapoint - Sistemas de Informação, Lda.</a></span>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  readonly heading = input.required<string>();
  readonly sub = input('');
  readonly wide = input(false);
}
