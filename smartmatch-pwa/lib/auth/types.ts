/**
 * Authentication & Authorization Type Definitions
 * Enterprise-grade security type system
 */

/**
 * Security context for authenticated user
 */
export interface SecurityContext {
  readonly id: string;
  readonly email: string;
  readonly role: "user" | "admin" | "moderator";
  readonly permissions: readonly string[];
  readonly authenticatedAt: Date;
  readonly expiresAt: Date;
  readonly metadata?: Record<string, any>;
}

/**
 * User roles with predefined permissions
 */
export const USER_ROLES = {
  user: ["phones.read", "recommendations.read"] as const,
  moderator: ["phones.read", "phones.update", "recommendations.read", "recommendations.generate"] as const,
  admin: [
    "phones.read",
    "phones.create",
    "phones.update",
    "phones.delete",
    "recommendations.read",
    "recommendations.generate",
    "recommendations.admin",
    "users.read",
    "admin.system",
    "admin.audit",
    "admin.metrics",
  ] as const,
} as const;

export type UserRole = keyof typeof USER_ROLES;

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  permissions: readonly string[];
  iat: number; // Issued at
  exp: number; // Expires at
  iss?: string; // Issuer
  aud?: string; // Audience
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: readonly string[];
}

/**
 * Multi-factor authentication configuration
 */
export interface MFAConfig {
  enabled: boolean;
  required: boolean;
  methods: readonly MFAMethod[];
}

export type MFAMethod = "totp" | "sms" | "email" | "hardware";

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAgeDays: number;
  preventReuseCount: number;
}

/**
 * Session management options
 */
export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  refreshTokenExpiryDays: number;
  rememberMeEnabled: boolean;
}

/**
 * Security audit event types
 */
export enum AuditEventType {
  USER_LOGIN = "user_login",
  USER_LOGOUT = "user_logout",
  PERMISSION_DENIED = "permission_denied",
  RESOURCE_ACCESS = "resource_access",
  DATA_MODIFIED = "data_modified",
  SECURITY_VIOLATION = "security_violation",
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  event: AuditEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  success: boolean;
  details?: Record<string, any>;
}
