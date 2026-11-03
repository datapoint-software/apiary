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
  readonly certificateId?: string;
  readonly changedAt: string;
  readonly changedBy?: string;
  readonly disabled: boolean;
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

export type CertificateStatus = 'ok' | 'pending' | 'failing' | 'expiring' | 'expired';

export interface CertificateSummary {
  readonly id: string;
  readonly source: 'automatic' | 'uploaded';
  readonly name: string;
  readonly hosts: readonly string[];
  readonly projectId?: string;
  readonly issuer?: string;
  readonly notBefore?: string;
  readonly notAfter?: string;
  readonly renewsFrom?: string;
  readonly status: CertificateStatus;
  readonly failureCode?: string;
  readonly nextAttemptAt?: string;
  readonly routeCount: number;
  readonly unusedSince?: string;
}

export interface CertificateEvent {
  readonly at: string;
  readonly kind: 'issued' | 'renewed' | 'uploaded' | 'replaced' | 'failed';
  readonly code?: string;
  readonly detail?: string;
  readonly by?: string;
}

export interface CertificateDetails {
  readonly certificate: CertificateSummary;
  readonly chainLength: number;
  readonly routes: readonly { readonly id: string; readonly host: string; readonly path: string }[];
  readonly history: readonly CertificateEvent[];
  readonly addedAt: string;
  readonly addedBy?: string;
}

export interface CertificatePreview {
  readonly hosts: readonly string[];
  readonly issuer: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly chainLength: number;
}

export interface RenewResult {
  readonly renewed: boolean;
  readonly notAfter?: string;
  readonly failureCode?: string;
  readonly failureDetail?: string;
}

export type MemberRole = 'leader' | 'voter' | 'joining';

export interface MemberView {
  readonly id?: string;
  readonly node?: string;
  readonly address: string;
  readonly role: MemberRole;
  readonly reachable: boolean;
  readonly local: boolean;
  readonly joinedAt?: string;
  readonly missingSince?: string;
}

export type MembershipMode = 'automatic' | 'manual';

export interface MembershipSettings {
  readonly mode: MembershipMode;
  readonly removeMissingAfterMinutes: number;
}

export interface PendingReplica {
  readonly id: string;
  readonly node: string;
  readonly address: string;
  readonly since: string;
}

export interface ClusterView {
  readonly mode: 'Standalone' | 'Swarm';
  readonly ready: boolean;
  readonly writable: boolean;
  readonly index: number;
  readonly replicaId?: string;
  readonly members: readonly MemberView[];
  readonly membership: MembershipSettings;
  readonly pending: readonly PendingReplica[];
}

export interface BackupFile {
  readonly name: string;
  readonly content: string;
  readonly index: number;
}

export interface ReplicaRootKey {
  readonly id: string;
  readonly node: string;
  readonly rootKeyId?: string;
}

export interface RootKeyStatus {
  readonly current: string;
  readonly currentSince?: string;
  readonly target?: string;
  readonly targetSince?: string;
  readonly replicas: readonly ReplicaRootKey[];
}

export interface BackupStatus {
  readonly lastAt?: string;
  readonly lastBy?: string;
  readonly changesSince: number;
}

export interface RestoredBackup {
  readonly takenAt: string;
  readonly routes: number;
  readonly users: number;
  readonly certificates: number;
}
