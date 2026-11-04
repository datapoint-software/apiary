import { ApiProblem } from '@datapoint/apiary-ui';
import {
  ActivityPoint,
  CertificateDetails,
  CertificateSummary,
  ClusterView,
  MemberView,
  ProjectView,
  RouteView,
  SignedInUser,
  UserView,
} from '../api/models';
import { PasswordModel, RouteModel, emptyRoute } from '../routes/route-model';

export function aRoute(overrides: Partial<RouteView> = {}): RouteView {
  return {
    id: 'route-1',
    projectId: 'project-1',
    host: 'shop.example.com',
    path: '/',
    targets: [{ host: 'shop-v1', port: 8080, weight: 100 }],
    timeoutSeconds: 30,
    changedAt: '2026-11-01T10:00:00Z',
    disabled: false,
    allowedAddresses: [],
    sticky: false,
    compression: false,
    caching: false,
    strictTransport: false,
    strictTransportSubdomains: false,
    requestsPerMinute: 0,
    health: 'healthy',
    targetsDown: 0,
    ...overrides,
  };
}

export function aProject(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'project-1',
    name: 'Shop',
    description: '',
    icon: 'store',
    routeCount: 1,
    redirectCount: 0,
    streamCount: 0,
    certificateCount: 0,
    requestsPerMinute: 0,
    routesDown: 0,
    routesDegraded: 0,
    ...overrides,
  };
}

export function aSignedInUser(overrides: Partial<SignedInUser> = {}): SignedInUser {
  return {
    id: 'user-1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role: 'administrator',
    recoveryCodesLeft: 10,
    singleSignOn: false,
    ...overrides,
  };
}

export function aUser(overrides: Partial<UserView> = {}): UserView {
  return {
    id: 'user-2',
    name: 'Rui Costa',
    email: 'rui@example.com',
    role: 'operator',
    status: 'active',
    twoStepOn: true,
    singleSignOn: false,
    ...overrides,
  };
}

export function aMember(overrides: Partial<MemberView> = {}): MemberView {
  return {
    id: 'member-1',
    node: 'node-a',
    address: '10.0.0.1:7946',
    role: 'voter',
    reachable: true,
    local: false,
    ...overrides,
  };
}

export function aCluster(overrides: Partial<ClusterView> = {}): ClusterView {
  return {
    mode: 'Swarm',
    ready: true,
    writable: true,
    index: 1,
    members: [aMember()],
    membership: { mode: 'automatic', removeMissingAfterMinutes: 15 },
    pending: [],
    ...overrides,
  };
}

export function aCertificate(overrides: Partial<CertificateSummary> = {}): CertificateSummary {
  return {
    id: 'certificate-1',
    source: 'automatic',
    name: 'shop.example.com',
    hosts: ['shop.example.com'],
    status: 'ok',
    routeCount: 1,
    ...overrides,
  };
}

export function aCertificateDetails(
  overrides: Partial<CertificateDetails> = {},
): CertificateDetails {
  return {
    certificate: aCertificate(),
    chainLength: 0,
    routes: [],
    history: [],
    addedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

export function anActivityPoint(overrides: Partial<ActivityPoint> = {}): ActivityPoint {
  return {
    at: '2026-11-04T10:00:00Z',
    requests: 0,
    errors: 0,
    ...overrides,
  };
}

export function aRouteModel(overrides: Partial<RouteModel> = {}): RouteModel {
  return {
    ...emptyRoute('project-1'),
    host: 'shop.example.com',
    targets: [{ host: 'shop-v1', port: 8080, weight: 100 }],
    ...overrides,
  };
}

export function aPasswordModel(overrides: Partial<PasswordModel> = {}): PasswordModel {
  return {
    enabled: true,
    replace: true,
    newPassword: 'correct-horse-battery-staple',
    days: '7',
    message: '',
    link: false,
    newLink: false,
    ...overrides,
  };
}

export function aProblem(
  status: number,
  code: string,
  errors: ApiProblem['errors'] = undefined,
): ApiProblem {
  return errors ? { status, code, errors } : { status, code };
}
