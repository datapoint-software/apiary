import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Role } from '../api/models';
import { Auth } from '../auth/auth';
import { Answers, answerAll } from '../testing/answer-all';
import {
  aCertificate,
  aCluster,
  aMember,
  aProject,
  aRoute,
  aSignedInUser,
  aUser,
} from '../testing/builders';
import { ClosingDialog } from '../testing/closing-dialog';
import { byRole, queryByRole, textOf } from '../testing/dom';
import { Overview } from './overview';

const quiet: Answers = {
  '/api/projects/list': [aProject()],
  '/api/certificates/list': [],
  '/api/routes/list': [aRoute()],
  '/api/cluster/status': aCluster(),
  '/api/activity/get': { minutesPerPoint: 1, points: [] },
  '/api/audit/list': [],
  '/api/backups/status': {},
  '/api/users/list': [aUser()],
};

async function render(
  answers: Partial<Record<keyof typeof quiet, unknown>> = {},
  role: Role = 'administrator',
  hour = 9,
): Promise<ComponentFixture<Overview>> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 4, hour));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Dialog, useValue: new ClosingDialog() },
    ],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role, name: 'Ana Silva' }));
  const fixture = TestBed.createComponent(Overview);
  await answerAll(fixture, TestBed.inject(HttpTestingController), { ...quiet, ...answers });
  return fixture;
}

describe('Overview', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    [9, 'Good morning, Ana'],
    [14, 'Good afternoon, Ana'],
    [20, 'Good evening, Ana'],
  ])('greets the person by first name at %i h', async (hour, greeting) => {
    const fixture = await render({}, 'administrator', hour);

    expect(byRole(fixture, 'heading', greeting)).toBeTruthy();
  });

  it('warns about unreachable replicas', async () => {
    const fixture = await render({
      '/api/cluster/status': aCluster({
        members: [
          aMember({ id: 'm-1', address: '10.0.0.1:7946', role: 'leader' }),
          aMember({ id: 'm-2', address: '10.0.0.2:7946', reachable: false }),
        ],
      }),
    });

    expect(textOf(fixture)).toContain('1 replica is unreachable');
  });

  it('warns about a route that is down', async () => {
    const fixture = await render({
      '/api/routes/list': [aRoute({ health: 'down' })],
    });

    expect(textOf(fixture)).toContain(
      'shop.example.com is down None of its targets answer health checks, so visitors get an error. Check that shop-v1 is running',
    );
  });

  it('warns about a certificate that needs attention', async () => {
    const fixture = await render({
      '/api/certificates/list': [
        aCertificate({ status: 'failing', notAfter: '2026-11-14T09:00:00Z' }),
      ],
    });

    expect(textOf(fixture)).toContain(
      'The certificate for shop.example.com needs attention It expires in 10 days.',
    );
  });

  it('says when a certificate needing attention was never issued', async () => {
    const fixture = await render({
      '/api/certificates/list': [aCertificate({ status: 'failing' })],
    });

    expect(textOf(fixture)).toContain('It hasn’t been issued yet.');
  });

  it('helps an administrator get started when there are no routes', async () => {
    const fixture = await render({ '/api/routes/list': [] });

    expect(byRole(fixture, 'heading', 'Get started')).toBeTruthy();
  });

  it('shows the traffic once there are routes', async () => {
    const fixture = await render();

    expect(queryByRole(fixture, 'heading', 'Get started')).toBeUndefined();
  });

  it('shows at most three projects, and how many there are', async () => {
    const fixture = await render({
      '/api/projects/list': ['a', 'b', 'c', 'd'].map((id) => aProject({ id, name: `P-${id}` })),
    });

    expect([
      byRole(fixture, 'link', 'See all 4'),
      queryByRole(fixture, 'heading', 'P-c'),
      queryByRole(fixture, 'heading', 'P-d'),
    ]).toEqual([expect.anything(), expect.anything(), undefined]);
  });

  it('offers a viewer no way to add a route', async () => {
    const fixture = await render({}, 'viewer');

    expect(queryByRole(fixture, 'link', 'Add route')).toBeUndefined();
  });
});
