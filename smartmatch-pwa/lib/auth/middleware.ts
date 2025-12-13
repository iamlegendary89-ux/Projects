/**
 * Authentication & Authorization Middleware
 * Military-grade security controls for SmartMatch Harmony
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, validatePermissions } from "./auth";
import { SecurityContext } from "./types";
import { SecurityEvent, createSecurityAudit } from "../utils/security/audit";

export interface AuthenticatedRequest extends NextRequest {
  user: SecurityContext;
  permissions: readonly string[];
}

/**
 * Authentication middleware - validates user identity
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      await createSecurityAudit({
        event: SecurityEvent.UNAUTHORIZED_ACCESS,
        resource: request.url,
        ip: (request as any).ip || request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("User-Agent") || "unknown",
        details: { reason: "Missing or invalid Authorization header" },
      });

      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const userContext = await verifyToken(token);

    if (!userContext) {
      await createSecurityAudit({
        event: SecurityEvent.INVALID_TOKEN,
        resource: request.url,
        ip: (request as any).ip || request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("User-Agent") || "unknown",
        details: { reason: "Token verification failed" },
      });

      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    // Extend request with authenticated user context
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = userContext;

    return authenticatedRequest;
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      {
        status: 500,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      },
    );
  }
}

/**
 * Authorization middleware - validates user permissions
 */
export function authorizeRequest(
  authenticatedRequest: AuthenticatedRequest,
  requiredPermissions: readonly string[],
  options: AuthorizationOptions = {},
): authenticatedRequest is AuthenticatedRequest {
  const { requireAll = true, resource, action } = options;

  try {
    const userPermissions =
      authenticatedRequest.permissions || (authenticatedRequest.user ? [authenticatedRequest.user.role] : []);

    const hasPermission = validatePermissions(userPermissions, requiredPermissions, { requireAll });

    if (!hasPermission) {
      // Fire and forget - don't block response on audit logging
      createSecurityAudit({
        event: SecurityEvent.INSUFFICIENT_PERMISSIONS,
        resource: resource || authenticatedRequest.url,
        userId: authenticatedRequest.user.id,
        ip: (authenticatedRequest as any).ip || authenticatedRequest.headers.get("x-forwarded-for") || "unknown",
        userAgent: authenticatedRequest.headers.get("User-Agent") || "unknown",
        details: {
          required: requiredPermissions,
          actual: userPermissions,
          action: action || "access",
        },
      }).catch((err) => console.error("Security audit logging failed:", err));

      return false;
    }

    return true;
  } catch (error) {
    console.error("Authorization middleware error:", error);
    return false;
  }
}

/**
 * Comprehensive authentication and authorization middleware
 * Combines authentication and authorization in single middleware
 */
export async function authenticateAndAuthorizeRequest(
  request: NextRequest,
  requiredPermissions: readonly string[],
  options: AuthOptions = {},
): Promise<AuthenticatedRequest | NextResponse> {
  // Step 1: Authenticate user
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Authentication failed
  }

  const authenticatedRequest = authResult;

  // Step 2: Authorize based on permissions
  const { permissions } = options;
  authenticatedRequest.permissions = permissions || [authenticatedRequest.user.role];

  if (!authorizeRequest(authenticatedRequest, requiredPermissions, options)) {
    return NextResponse.json(
      { error: "Insufficient permissions for this operation" },
      {
        status: 403,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      },
    );
  }

  // Step 3: Apply security headers
  const response = NextResponse.next();
  applySecurityHeaders(response);

  return authenticatedRequest;
}

/**
 * Apply comprehensive security headers
 */
function applySecurityHeaders(response: NextResponse): void {
  const headers = response.headers;

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy - strict by default
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  );

  // HSTS
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Feature Policy / Permissions Policy
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
}

export interface AuthOptions extends AuthorizationOptions {
  permissions?: readonly string[];
}

export interface AuthorizationOptions {
  requireAll?: boolean;
  resource?: string;
  action?: string;
}

/**
 * Role-based access control permissions
 */
export const PERMISSIONS = {
  // Phone management
  "phones.read": "Read phone data",
  "phones.create": "Create new phones",
  "phones.update": "Update phone information",
  "phones.delete": "Delete phones",

  // Recommendation system
  "recommendations.read": "Read recommendations",
  "recommendations.generate": "Generate recommendations",
  "recommendations.admin": "Manage recommendation system",

  // User management
  "users.read": "Read user data",
  "users.create": "Create new users",
  "users.update": "Update user information",
  "users.delete": "Delete users",

  // Administrative
  "admin.system": "Complete system administration",
  "admin.audit": "Access audit logs",
  "admin.metrics": "Access system metrics",
  "admin.config": "Modify system configuration",
} as const;

export type Permission = keyof typeof PERMISSIONS;
