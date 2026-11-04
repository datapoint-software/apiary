import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { nextRequest } from './testing/backend';
import { aProblem } from './testing/builders';

const sessionEnded = { status: 401, statusText: 'Unauthorized' };

async function visitSignedOut(url: string, setupOpen: boolean): Promise<string> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
  });
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  const navigation = harness.navigateByUrl(url);
  (await nextRequest(backend, '/api/auth/me')).flush(aProblem(401, 'auth.required'), sessionEnded);
  (await nextRequest(backend, '/api/setup/status')).flush({ open: setupOpen });
  await navigation;
  return TestBed.inject(Router).url;
}

describe('app routes', () => {
  it('sends a signed-out visitor to sign in before showing a page', async () => {
    expect(await visitSignedOut('/certificates', false)).toBe('/sign-in?next=%2Fcertificates');
  });

  it('sends the first visitor of a new cluster to setup', async () => {
    expect(await visitSignedOut('/', true)).toBe('/setup');
  });

  it('sends a signed-out visitor to sign in before connecting an agent', async () => {
    expect(await visitSignedOut('/connect', false)).toBe('/sign-in?next=%2Fconnect');
  });
});
