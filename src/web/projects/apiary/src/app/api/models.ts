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
  readonly allowedAddresses: readonly string[];
  readonly maintenance?: MaintenanceWindow;
  readonly canary?: RouteCanary;
  readonly sticky: boolean;
  readonly compression: boolean;
  readonly caching: boolean;
  readonly cachePurgedAt?: string;
  readonly requestsPerMinute: number;
  readonly health: RouteHealth;
  readonly targetsDown: number;
}

export interface RouteCanary {
  readonly source: 'header' | 'cookie';
  readonly name: string;
  readonly value: string;
}

export type RouteHealth = 'unknown' | 'healthy' | 'degraded' | 'down';

export interface MaintenanceWindow {
  readonly start: string;
  readonly end: string;
  readonly message?: string;
}

export interface RedirectView {
  readonly id: string;
  readonly projectId: string;
  readonly from: string;
  readonly to: string;
  readonly statusCode: number;
  readonly keepPath: boolean;
  readonly changedAt: string;
  readonly changedBy?: string;
}

export type StreamProtocol = 'tcp' | 'udp';

export interface StreamRouteView {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly protocol: StreamProtocol;
  readonly listenPort: number;
  readonly targetHost: string;
  readonly targetPort: number;
  readonly serverNames: readonly string[];
  readonly idleTimeoutSeconds: number;
  readonly connections: number;
  readonly changedAt: string;
  readonly changedBy?: string;
}

export interface ProjectView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly routeCount: number;
  readonly redirectCount: number;
  readonly streamCount: number;
  readonly certificateCount: number;
  readonly requestsPerMinute: number;
  readonly routesDown: number;
  readonly routesDegraded: number;
}

export type Role = 'viewer' | 'operator' | 'administrator';

export interface SignedInUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly twoStepSetUpAt?: string;
  readonly recoveryCodesLeft: number;
  readonly singleSignOn: boolean;
}

export interface SignInOptions {
  readonly singleSignOn?: string;
}

export interface SsoSettingsView {
  readonly enabled: boolean;
  readonly displayName: string;
  readonly issuer: string;
  readonly clientId: string;
  readonly hasClientSecret: boolean;
  readonly groupsClaim: string;
  readonly administratorGroups: readonly string[];
  readonly operatorGroups: readonly string[];
  readonly viewerGroups: readonly string[];
  readonly changedAt?: string;
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
  readonly singleSignOn: boolean;
}

export interface AgentView {
  readonly id: string;
  readonly name: string;
  readonly user?: string;
  readonly connectedAt: string;
  readonly lastUsedAt: string;
  readonly mine: boolean;
}

export interface AgentClientView {
  readonly name: string;
  readonly redirectUri: string;
  readonly returnsTo: string;
  readonly returnsToThisComputer: boolean;
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
