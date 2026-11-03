export interface RouteTarget {
  readonly host: string;
  readonly port: number;
  readonly weight: number;
}

export interface RouteView {
  readonly id: string;
  readonly projectId: string;
  readonly host: string;
  readonly path: string;
  readonly targets: readonly RouteTarget[];
  readonly timeoutSeconds: number;
  readonly changedAt: string;
  readonly changedBy?: string;
}

export interface ProjectView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly routeCount: number;
}

export type Role = 'viewer' | 'operator' | 'administrator';

export interface SignedInUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly twoStepSetUpAt?: string;
  readonly recoveryCodesLeft: number;
}

export interface TwoStepEnrollment {
  readonly challenge: string;
  readonly secret: string;
  readonly uri: string;
}

export interface SignInStep {
  readonly next: 'code' | 'enroll';
  readonly challenge: string;
  readonly enrollment?: TwoStepEnrollment;
}

export interface SetupStatus {
  readonly open: boolean;
  readonly closesAt?: string;
}

export interface InviteView {
  readonly name: string;
  readonly email: string;
  readonly enrollment: TwoStepEnrollment;
}

export interface InviteLink {
  readonly userId: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface UserView {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly status: 'invited' | 'active' | 'disabled';
  readonly twoStepOn: boolean;
  readonly lastSignInAt?: string;
  readonly inviteExpiresAt?: string;
}

export interface SessionView {
  readonly id: string;
  readonly device?: string;
  readonly address?: string;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
}

export interface AuditEntry {
  readonly id: string;
  readonly at: string;
  readonly user?: string;
  readonly client?: string;
  readonly address?: string;
  readonly action: string;
  readonly affected: readonly string[];
  readonly projectId?: string;
  readonly outcome: 'succeeded' | 'failed' | 'denied';
}
