import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectView, Role, RouteView } from '../api/models';
import { Auth } from '../auth/auth';
import { aCluster, aProject, aRoute, aSignedInUser } from '../testing/builders';
import {
  allByRole,
  byLabel,
  byRole,
  choose,
  queryByRole,
  settle,
  textOf,
  type,
} from '../testing/dom';
import { RouteList } from './route-list';

const shopProject = aProject({ id: 'project-1', name: 'Shop' });
const blogProject = aProject({ id: 'project-2', name: 'Blog' });
const shop = aRoute({ id: 'route-1', projectId: 'project-1', host: 'shop.example.com' });
const blog = aRoute({
  id: 'route-2',
  projectId: 'project-2',
  host: 'blog.example.com',
  targets: [{ host: 'ghost', port: 2368, weight: 100 }],
  health: 'down',
});

async function render(
  routes: RouteView[],
  projects: ProjectView[] = [shopProject, blogProject],
  role: Role = 'operator',
) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  const fixture = TestBed.createComponent(RouteList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/routes/list').flush(routes);
  backend.expectOne('/api/projects/list').flush(projects);
  backend.match('/api/cluster/status').forEach((request) => request.flush(aCluster()));
  await settle(fixture);
  return fixture;
}

function hostLinks(fixture: Awaited<ReturnType<typeof render>>): string[] {
  return allByRole(fixture, 'link').filter((name) => name.endsWith('.example.com'));
}

describe('RouteList', () => {
  it('lists every route', async () => {
    const fixture = await render([shop, blog]);

    expect(hostLinks(fixture)).toEqual(['shop.example.com', 'blog.example.com']);
  });

  it('groups the routes by project', async () => {
    const fixture = await render([shop, blog]);

    expect(textOf(fixture)).toContain('Shop1 route · 0 req/min');
  });

  it('counts the routes shown', async () => {
    const fixture = await render([shop, blog]);

    expect(textOf(fixture)).toContain('2 of 2 routes');
  });

  it('explains what a route is when there are none', async () => {
    const fixture = await render([]);

    expect(byRole(fixture, 'heading', 'No routes yet')).toBeTruthy();
  });

  it('offers an operator to add the first route', async () => {
    const fixture = await render([]);

    expect(allByRole(fixture, 'link').filter((name) => name === 'Add route')).toHaveLength(2);
  });

  it('offers a viewer no way to add a route', async () => {
    const fixture = await render([], [shopProject], 'viewer');

    expect(queryByRole(fixture, 'link', 'Add route')).toBeUndefined();
  });

  it('filters by hostname', async () => {
    const fixture = await render([shop, blog]);

    type(byLabel(fixture, 'Filter by hostname or target'), 'BLOG');
    await settle(fixture);

    expect(hostLinks(fixture)).toEqual(['blog.example.com']);
  });

  it('filters by target', async () => {
    const fixture = await render([shop, blog]);

    type(byLabel(fixture, 'Filter by hostname or target'), 'ghost');
    await settle(fixture);

    expect(hostLinks(fixture)).toEqual(['blog.example.com']);
  });

  it('shows only the routes that need attention', async () => {
    const fixture = await render([shop, blog]);

    byRole(fixture, 'button', 'Needs attention').click();
    await settle(fixture);

    expect(hostLinks(fixture)).toEqual(['blog.example.com']);
  });

  it('shows only one project’s routes', async () => {
    const fixture = await render([shop, blog]);

    choose(byRole(fixture, 'combobox', 'Project'), 'project-1');
    await settle(fixture);

    expect(hostLinks(fixture)).toEqual(['shop.example.com']);
  });

  it('says when no route matches the filters', async () => {
    const fixture = await render([shop, blog]);

    type(byLabel(fixture, 'Filter by hostname or target'), 'nothing-like-this');
    await settle(fixture);

    expect(byRole(fixture, 'heading', 'No routes match')).toBeTruthy();
  });

  it('shows every route again after clearing the filters', async () => {
    const fixture = await render([shop, blog]);
    type(byLabel(fixture, 'Filter by hostname or target'), 'nothing-like-this');
    await settle(fixture);

    byRole(fixture, 'button', 'Clear filters').click();
    await settle(fixture);

    expect(hostLinks(fixture)).toEqual(['shop.example.com', 'blog.example.com']);
  });
});
