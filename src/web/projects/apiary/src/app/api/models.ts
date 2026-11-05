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
  readonly rateLimit?: number;
  readonly requestSize: 'default' | 'custom' | 'unlimited';
  readonly requestMegabytes?: number;
  readonly maintenance?: MaintenanceWindow;
  readonly canary?: RouteCanary;
  readonly sticky: boolean;
  readonly compression: boolean;
  readonly caching: boolean;
  readonly strictTransport: boolean;
  readonly strictTransportSubdomains: boolean;
  readonly cachePurgedAt?: string;
  readonly password?: RoutePasswordView;
  readonly requestsPerMinute: number;
  readonly health: RouteHealth;
  readonly targetsDown: number;
  readonly stack?: StackSource;
}

export interface RouteDefaultsView {
  readonly requestMegabytes: number;
}

export interface RoutePasswordView {
  readonly setAt: string;
  readonly setBy?: string;
  readonly days: number;
  readonly message?: string;
  readonly linkMadeAt?: string;
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
  readonly path: string;
  readonly to: string;
  readonly statusCode: number;
  readonly keepPath: boolean;
  readonly changedAt: string;
  readonly changedBy?: string;
  readonly stack?: StackSource;
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
  readonly disabled: boolean;
  readonly allowedAddresses: readonly string[];
  readonly connections: number;
  readonly lastConnectionAt?: string;
  readonly changedAt: string;
  readonly changedBy?: string;
  readonly stack?: StackSource;
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
  readonly language?: string;
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
  readonly endsAt: string;
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
  readonly userId?: string;
  readonly pipeline?: string;
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

export interface AgentPolicyView {
  readonly trustedOrigins: readonly string[];
}

export interface SessionPolicyView {
  readonly idleMinutes: number;
}

export interface AdminCertificateView {
  readonly selfSigned: boolean;
  readonly hosts: readonly string[];
  readonly issuer: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly fingerprint: string;
  readonly changedAt: string;
  readonly changedBy: string | null;
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

export interface RecoverySurvivor {
  readonly node?: string;
  readonly address: string;
  readonly index: number;
}

export interface RecoveryPlan {
  readonly needed: boolean;
  readonly node?: string;
  readonly index: number;
  readonly lastChangeAt?: string;
  readonly survivors: readonly RecoverySurvivor[];
  readonly unreachable: readonly string[];
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

export type ActivityRange = 'hour' | 'day';

export interface ActivityPoint {
  readonly at: string;
  readonly requests: number;
  readonly errors: number;
  readonly p95Milliseconds?: number;
}

export interface ActivityView {
  readonly minutesPerPoint: number;
  readonly points: readonly ActivityPoint[];
  readonly p95Milliseconds?: number;
}

export interface BrandView {
  readonly name: string;
  readonly accent: string;
  readonly contact?: string;
  readonly logo?: string;
  readonly logoName?: string;
  readonly changedAt: string;
  readonly changedBy?: string;
}

export interface ProjectBrandView {
  readonly projectId: string;
  readonly projectName: string;
  readonly brand: BrandView;
}

export interface BrandsView {
  readonly cluster?: BrandView;
  readonly projects: readonly ProjectBrandView[];
}

export interface StackSource {
  readonly stack: string;
  readonly service: string;
  readonly name: string;
  readonly fields: readonly string[];
}

export type StackItemKind = 'route' | 'streamRoute' | 'redirect';

export interface StackPlanItem {
  readonly kind: StackItemKind;
  readonly name: string;
  readonly field?: string;
  readonly from?: string;
  readonly to?: string;
  readonly replacedBy?: string;
  readonly replacedAt?: string;
}

export interface StackPlan {
  readonly added: readonly StackPlanItem[];
  readonly changed: readonly StackPlanItem[];
  readonly removed: readonly StackPlanItem[];
}

export interface StackApply {
  readonly at: string;
  readonly token: string;
  readonly commit?: string;
  readonly pipelineUrl?: string;
  readonly plan: StackPlan;
}

export interface StackFailure {
  readonly at: string;
  readonly code: string;
  readonly token: string;
  readonly detail?: string;
}

export interface StackView {
  readonly name: string;
  readonly projectId?: string;
  readonly createdAt: string;
  readonly createdBy?: string;
  readonly lastApply?: StackApply;
  readonly failure?: StackFailure;
  readonly routes: number;
  readonly streamRoutes: number;
  readonly redirects: number;
}

export interface DeclaredItemView {
  readonly kind: StackItemKind;
  readonly id: string;
  readonly name: string;
  readonly service: string;
  readonly protocol?: StreamProtocol;
  readonly listenPort?: number;
}

export interface PipelineTokenView {
  readonly id: string;
  readonly name: string;
  readonly stack: string;
  readonly createdAt: string;
  readonly createdBy?: string;
  readonly expiresAt: string;
  readonly lastUsedAt?: string;
}

export interface StackDetailsView {
  readonly stack: StackView;
  readonly items: readonly DeclaredItemView[];
  readonly tokens: readonly PipelineTokenView[];
}

export interface NewPipelineToken {
  readonly id: string;
  readonly name: string;
  readonly stack: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface TrustedProxyView {
  readonly id: string;
  readonly range: string;
  readonly note: string | null;
  readonly public: boolean;
  readonly lastRequestAt: string | null;
}
