import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectView } from '../api/models';
import { aProject } from '../testing/builders';
import { settle, textOf } from '../testing/dom';
import { ProjectCards } from './project-cards';

async function render(project: ProjectView): Promise<ComponentFixture<ProjectCards>> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ProjectCards);
  fixture.componentRef.setInput('projects', [project]);
  await settle(fixture);
  return fixture;
}

describe('ProjectCards', () => {
  it('links each card to its project', async () => {
    const fixture = await render(aProject({ id: 'project-1' }));

    expect((fixture.nativeElement as HTMLElement).querySelector('a')?.getAttribute('href')).toBe(
      '/projects/project-1',
    );
  });

  it('shows the description, routes, requests and redirects', async () => {
    const fixture = await render(
      aProject({
        name: 'Shop',
        description: 'Online store',
        routeCount: 2,
        requestsPerMinute: 30,
        redirectCount: 1,
      }),
    );

    expect(textOf(fixture)).toBe('HealthyShopOnline store2 routes30 req/min1 redirect');
  });

  it('says when a project has no description', async () => {
    const fixture = await render(aProject({ description: '' }));

    expect(textOf(fixture)).toContain('No description');
  });

  it.each([
    [{ routesDown: 2, routesDegraded: 1 }, '2 routes down'],
    [{ routesDown: 1 }, '1 route down'],
    [{ routesDegraded: 3 }, '3 routes degraded'],
    [{ routeCount: 1 }, 'Healthy'],
    [{ routeCount: 0 }, 'No routes'],
  ] as [Partial<ProjectView>, string][])(
    'summarizes the health of %o as %s',
    async (overrides, health) => {
      const fixture = await render(aProject(overrides));

      expect(textOf(fixture).startsWith(health)).toBe(true);
    },
  );
});
