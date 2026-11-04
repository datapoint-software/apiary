import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, Icon, Status, TranslatePipe } from '@datapoint/apiary-ui';
import { Plus } from 'lucide';
import { Api } from '../api/api';
import { UserView } from '../api/models';
import { WriteLock } from '../cluster/write-lock';
import { ProjectActions } from '../projects/project-actions';

@Component({
  selector: 'ap-get-started',
  imports: [WriteLock, RouterLink, Banner, Button, Icon, Status, TranslatePipe],
  host: { style: 'display: contents' },
  template: `
    <section class="ap-panel" aria-labelledby="get-started-title">
      <div class="ap-panel-head">
        <h2 class="ap-h ap-h-2" id="get-started-title">{{ 'Get started' | t }}</h2>
        <span class="ap-caption">{{ '{done} of 4 done' | t: { done: done() } }}</span>
      </div>
      <div class="ap-panel-body">
        <ol class="ap-list" style="margin: 0; padding: 0; list-style: none; counter-reset: step">
          <li class="ap-list-row">
            <div class="ap-row" style="gap: 14px; align-items: flex-start; flex: 1 1 300px">
              <span class="ap-step ap-step-done" aria-hidden="true"></span>
              <div class="ap-list-text">
                <strong>{{ 'Create your administrator' | t }}</strong>
                <span class="ap-muted">{{ 'Done: you’re signed in as an Administrator.' | t }}</span>
              </div>
            </div>
            <ap-status tone="ok">{{ 'Done' | t }}</ap-status>
          </li>
          <li class="ap-list-row">
            <div class="ap-row" style="gap: 14px; align-items: flex-start; flex: 1 1 300px">
              <span class="ap-step" [class.ap-step-done]="hasProjects()" aria-hidden="true"></span>
              <div class="ap-list-text">
                <strong>{{ 'Create a project' | t }}</strong>
                <span class="ap-muted">{{ 'Routes start in Default. Projects group them with their certificates, such as one per site or team.' | t }}</span>
              </div>
            </div>
            @if (hasProjects()) {
              <ap-status tone="ok">{{ 'Done' | t }}</ap-status>
            } @else {
              <button apWrite apButton type="button" (click)="projects.create()"><ap-icon [icon]="plus" />{{ 'New project' | t }}</button>
            }
          </li>
          <li class="ap-list-row">
            <div class="ap-row" style="gap: 14px; align-items: flex-start; flex: 1 1 300px">
              <span class="ap-step" aria-hidden="true"></span>
              <div class="ap-list-text">
                <strong>{{ 'Add your first route' | t }}</strong>
                <span class="ap-muted">{{ 'Point a hostname at a service on a network Apiary shares. Apiary gets its certificate automatically.' | t }}</span>
              </div>
            </div>
            <a apWrite apButton="primary" routerLink="/routes/new"><ap-icon [icon]="plus" />{{ 'Add route' | t }}</a>
          </li>
          <li class="ap-list-row">
            <div class="ap-row" style="gap: 14px; align-items: flex-start; flex: 1 1 300px">
              <span class="ap-step" [class.ap-step-done]="hasTeam()" aria-hidden="true"></span>
              <div class="ap-list-text">
                <strong>{{ 'Invite your team' | t }}</strong>
                <span class="ap-muted">{{ 'Give each person their own account, with the least access they need.' | t }}</span>
              </div>
            </div>
            @if (hasTeam()) {
              <ap-status tone="ok">{{ 'Done' | t }}</ap-status>
            } @else {
              <a apButton routerLink="/users">{{ 'Invite people' | t }}</a>
            }
          </li>
        </ol>
      </div>
    </section>
    <ap-banner [heading]="'Back up before you go further' | t">
      {{ 'Backups are taken on demand. Take one after your first changes, and before every upgrade.' | t }}
      <a bannerActions routerLink="/backups">{{ 'Go to backups' | t }}</a>
    </ap-banner>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GetStarted {
  private readonly api = inject(Api);
  protected readonly projects = inject(ProjectActions);
  protected readonly plus = Plus;
  readonly projectCount = input.required<number>();
  private readonly users = httpResource<UserView[]>(() => this.api.query('users.list'), { defaultValue: [] });
  protected readonly hasProjects = computed(() => this.projectCount() > 1);
  protected readonly hasTeam = computed(() => this.users.value().length > 1);
  protected readonly done = computed(() => 1 + Number(this.hasProjects()) + Number(this.hasTeam()));
}
