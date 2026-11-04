import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Confirmer, I18n, Toaster } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { ProjectView } from '../api/models';
import { openDialog } from '../shell/open-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ProjectDialog, SavedProject } from './project-dialog';

@Service()
export class ProjectActions {
  private readonly api = inject(Api);
  private readonly dialog = inject(Dialog);
  private readonly confirmer = inject(Confirmer);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);

  async create(): Promise<void> {
    const saved = await openDialog<SavedProject, ProjectView | null>(this.dialog, ProjectDialog, null);
    if (saved) {
      this.toaster.show(this.i18n.t('{name} created. Add its first route next.', { name: saved.name }));
      await this.router.navigate(['/projects', saved.id]);
    }
  }

  async edit(project: ProjectView): Promise<void> {
    const saved = await openDialog<SavedProject, ProjectView | null>(this.dialog, ProjectDialog, project);
    if (saved) {
      this.toaster.show(this.i18n.t('{name} saved.', { name: saved.name }));
    }
  }

  async delete(project: ProjectView): Promise<void> {
    if (project.routeCount + project.redirectCount + project.certificateCount + project.streamCount > 0) {
      const movedTo = await openDialog<ProjectView, ProjectView>(this.dialog, DeleteProjectDialog, project);
      if (movedTo) {
        this.toaster.show(this.i18n.t('{name} deleted. What it held moved to {destination}.', { name: project.name, destination: movedTo.name }));
        await this.router.navigate(['/projects', movedTo.id]);
      }
      return;
    }
    const deleted = await this.confirmer.confirm({
      heading: this.i18n.t('Delete {name}?', { name: project.name }),
      text: this.i18n.t('The project is empty, so nothing else changes.'),
      confirm: this.i18n.t('Delete project'),
      busy: this.i18n.t('Deleting…'),
      action: () => this.api.send('projects.delete', { id: project.id }),
    });
    if (deleted) {
      this.toaster.show(this.i18n.t('{name} deleted.', { name: project.name }));
      await this.router.navigate(['/projects']);
    }
  }
}
