import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, Status } from '@datapoint/apiary-ui';
import { ProjectView } from '../api/models';
import { perMinute } from '../routes/route-status';
import { projectIcon } from '../shell/project-icons';
import { projectHealth } from './project-health';

@Component({
  selector: 'ap-project-cards',
  imports: [RouterLink, Icon, Status],
  template: `
    <div class="ap-projects">
      @for (project of projects(); track project.id) {
        @let health = projectHealth(project);
        <a class="ap-panel ap-project" [routerLink]="['/projects', project.id]">
          <div class="ap-project-head">
            <span class="ap-project-mark"><ap-icon [icon]="projectIcon(project.icon)" /></span>
            <ap-status [tone]="health[0]">{{ health[1] }}</ap-status>
          </div>
          <div>
            <h3 class="ap-h ap-h-3">{{ project.name }}</h3>
            <p class="ap-caption" style="margin: 2px 0 0; font-size: 13px; line-height: 18px">{{ project.description || 'No description' }}</p>
          </div>
          <div class="ap-project-facts">
            <span><b>{{ project.routeCount }}</b> {{ project.routeCount === 1 ? 'route' : 'routes' }}</span>
            <span><b>{{ perMinute(project.requestsPerMinute) }}</b> req/min</span>
            @if (project.redirectCount) {
              <span><b>{{ project.redirectCount }}</b> {{ project.redirectCount === 1 ? 'redirect' : 'redirects' }}</span>
            }
          </div>
        </a>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCards {
  readonly projects = input.required<readonly ProjectView[]>();
  protected readonly projectIcon = projectIcon;
  protected readonly projectHealth = projectHealth;
  protected readonly perMinute = perMinute;
}
