import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Role } from '../api/models';
import { aSignedInUser } from '../testing/builders';
import { Auth } from './auth';
import { requiresRole } from './requires-role';

function visitAs(role: Role, required: Role) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role }));
  return TestBed.runInInjectionContext(() =>
    requiresRole(required)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('requiresRole', () => {
  it('lets a user with the role through', () => {
    expect(visitAs('administrator', 'administrator')).toBe(true);
  });

  it('lets a user with a higher role through', () => {
    expect(visitAs('administrator', 'operator')).toBe(true);
  });

  it('sends a user without the role to the overview', () => {
    const result = visitAs('viewer', 'operator');

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});
