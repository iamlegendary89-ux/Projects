/**
 * Security Audit Module
 * Comprehensive audit logging and security event tracking
 */

import { safeWriteJson } from "../../io";

const AUDIT_LOG_PATH = "./data/logs/security-audit.json";

/**
 * Security event types with severity levels
 */
export enum SecurityEvent {
  USER_LOGIN = "user_login",
  USER_LOGOUT = "user_logout",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  INVALID_TOKEN = "invalid_token",
  INSUFFICIENT_PERMISSIONS = "insufficient_permissions",
  RESOURCE_ACCESS = "resource_access",
  DATA_MODIFIED = "data_modified",
  SECURITY_VIOLATION = "security_violation",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  API_RATE_LIMIT_EXCEEDED = "api_rate_limit_exceeded",
}

/**
 * Local audit entry interface for security events
 */
interface SecurityAuditEntry {
  id: string;
  timestamp: Date;
  event: SecurityEvent;
  userId?: string | undefined;
  ipAddress: string;
  userAgent: string;
  resource: string;
  severity: SecuritySeverity;
  details?: Record<string, any> | undefined;
}

/**
 * Security event severity levels
 */
export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Create security audit log entry
 */
export async function createSecurityAudit(params: {
  event: SecurityEvent;
  userId?: string;
  resource: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const auditEntry: SecurityAuditEntry = {
      id: `security-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      event: params.event,
      userId: params.userId,
      ipAddress: params.ip || "unknown",
      userAgent: params.userAgent || "unknown",
      resource: params.resource,
      severity: getEventSeverity(params.event),
      details: params.details,
    };

    // Log to console immediately
    console.warn(`🔒 SECURITY AUDIT: ${params.event}`, {
      userId: params.userId,
      ip: params.ip,
      resource: params.resource,
      timestamp: auditEntry.timestamp,
    });

    // Persist to audit log (fire and forget for performance)
    await persistAuditEntry(auditEntry);

    // Check for security alerts that need immediate attention
    await checkSecurityAlerts(auditEntry);
  } catch (error) {
    console.error("Failed to create security audit log:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get severity level for security event
 */
function getEventSeverity(event: SecurityEvent): SecuritySeverity {
  const severityMap: Record<SecurityEvent, SecuritySeverity> = {
    [SecurityEvent.USER_LOGIN]: SecuritySeverity.LOW,
    [SecurityEvent.USER_LOGOUT]: SecuritySeverity.LOW,
    [SecurityEvent.UNAUTHORIZED_ACCESS]: SecuritySeverity.HIGH,
    [SecurityEvent.INVALID_TOKEN]: SecuritySeverity.MEDIUM,
    [SecurityEvent.INSUFFICIENT_PERMISSIONS]: SecuritySeverity.HIGH,
    [SecurityEvent.RESOURCE_ACCESS]: SecuritySeverity.LOW,
    [SecurityEvent.DATA_MODIFIED]: SecuritySeverity.HIGH,
    [SecurityEvent.SECURITY_VIOLATION]: SecuritySeverity.CRITICAL,
    [SecurityEvent.SUSPICIOUS_ACTIVITY]: SecuritySeverity.HIGH,
    [SecurityEvent.API_RATE_LIMIT_EXCEEDED]: SecuritySeverity.MEDIUM,
  };

  return severityMap[event] || SecuritySeverity.MEDIUM;
}

/**
 * Persist audit entry to file storage
 */
async function persistAuditEntry(entry: SecurityAuditEntry): Promise<void> {
  try {
    // TODO: In production, this would go to a proper database with indexing
    // For now, append to JSON file (not suitable for production scale)
    const existingLogs = await loadAuditLogs();
    existingLogs.push(entry);

    // Keep only last 10,000 entries to prevent file size explosion
    const trimmedLogs = existingLogs.slice(-10000);

    await safeWriteJson(AUDIT_LOG_PATH, {
      lastUpdated: new Date().toISOString(),
      entries: trimmedLogs,
    });
  } catch (error) {
    console.error("Failed to persist audit entry:", error);
  }
}

/**
 * Load existing audit logs from storage
 */
async function loadAuditLogs(): Promise<SecurityAuditEntry[]> {
  try {
    const auditData = (await safeWriteJson(AUDIT_LOG_PATH, { entries: [] })) as any;
    return auditData.entries || [];
  } catch {
    return [];
  }
}

/**
 * Check for security alerts that need immediate attention
 */
async function checkSecurityAlerts(entry: SecurityAuditEntry): Promise<void> {
  const alerts = await analyzeSecurityPatterns(entry);

  for (const alert of alerts) {
    await triggerSecurityAlert(alert);
  }
}

/**
 * Analyze security patterns for potential threats
 */
async function analyzeSecurityPatterns(entry: SecurityAuditEntry): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];
  const recentLogs = await getRecentLogs(15 * 60 * 1000); // Last 15 minutes

  // Check for brute force login attempts
  if (entry.event === SecurityEvent.INVALID_TOKEN || entry.event === SecurityEvent.UNAUTHORIZED_ACCESS) {
    const failedAttempts = recentLogs.filter(
      (log) =>
        (log.event === SecurityEvent.INVALID_TOKEN || log.event === SecurityEvent.UNAUTHORIZED_ACCESS) &&
        log.ipAddress === entry.ipAddress &&
        log.userId === entry.userId,
    );

    if (failedAttempts.length >= 5) {
      alerts.push({
        severity: SecuritySeverity.HIGH,
        type: "BRUTE_FORCE_ATTEMPT",
        message: `Multiple failed authentication attempts from IP ${entry.ipAddress}`,
        details: { failedAttempts: failedAttempts.length, ip: entry.ipAddress },
      });
    }
  }

  // Check for privilege escalation attempts
  if (entry.event === SecurityEvent.INSUFFICIENT_PERMISSIONS) {
    const privilegeAttempts = recentLogs.filter(
      (log) => log.event === SecurityEvent.INSUFFICIENT_PERMISSIONS && log.userId === entry.userId,
    );

    if (privilegeAttempts.length >= 3) {
      alerts.push({
        severity: SecuritySeverity.MEDIUM,
        type: "PRIVILEGE_ESCALATION",
        message: `Multiple permission denied attempts by user ${entry.userId || "unknown"}`,
        details: { attempts: privilegeAttempts.length, userId: entry.userId },
      });
    }
  }

  return alerts;
}

/**
 * Get recent audit logs within time window
 */
async function getRecentLogs(timeWindowMs: number): Promise<SecurityAuditEntry[]> {
  const allLogs = await loadAuditLogs();
  const cutoffTime = new Date(Date.now() - timeWindowMs);

  return allLogs.filter((log) => log.timestamp >= cutoffTime);
}

/**
 * Trigger security alert (in production, this would send notifications)
 */
async function triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
  console.error(`🚨 ${alert.severity.toUpperCase()} SECURITY ALERT: ${alert.type}`);
  console.error(`   ${alert.message}`);
  console.error(`   Details:`, alert.details);

  // TODO: In production, this would:
  // 1. Send email/SMS to security team
  // 2. Create incident ticket
  // 3. Lock suspicious accounts
  // 4. Trigger automated responses

  // For now, just log the alert severity
  if (alert.severity === SecuritySeverity.CRITICAL) {
    console.error("🔴 CRITICAL: Immediate attention required!");
  }
}

/**
 * Get audit action description for event type
 */
export function getAuditAction(event: SecurityEvent): string {
  const actionMap = {
    [SecurityEvent.USER_LOGIN]: "login",
    [SecurityEvent.USER_LOGOUT]: "logout",
    [SecurityEvent.UNAUTHORIZED_ACCESS]: "unauthorized_access",
    [SecurityEvent.INVALID_TOKEN]: "token_validation",
    [SecurityEvent.INSUFFICIENT_PERMISSIONS]: "permission_check",
    [SecurityEvent.RESOURCE_ACCESS]: "resource_access",
    [SecurityEvent.DATA_MODIFIED]: "data_modification",
    [SecurityEvent.SECURITY_VIOLATION]: "security_check",
    [SecurityEvent.SUSPICIOUS_ACTIVITY]: "activity_monitoring",
    [SecurityEvent.API_RATE_LIMIT_EXCEEDED]: "rate_limit_check",
  };

  return actionMap[event] || "unknown_action";
}

/**
 * Get security events summary for dashboard
 */
export async function getSecurityEventsSummary(hourWindow = 24): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  recentAlerts: SecurityAlert[];
}> {
  const logs = await getRecentLogs(hourWindow * 60 * 60 * 1000); // Convert hours to milliseconds

  const eventsByType = logs.reduce(
    (acc, log) => {
      acc[log.event] = (acc[log.event] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Mock severity classification (in production, this would be based on actual risk assessment)
  const eventsBySeverity = {
    [SecuritySeverity.LOW]: 0,
    [SecuritySeverity.MEDIUM]: 0,
    [SecuritySeverity.HIGH]: 0,
    [SecuritySeverity.CRITICAL]: 0,
  };

  // Classify events by severity (simplified logic)
  logs.forEach((log) => {
    if (["insufficient_permissions", "unauthorized_access"].includes(log.event)) {
      eventsBySeverity[SecuritySeverity.HIGH]++;
    } else if (["invalid_token", "security_violation"].includes(log.event)) {
      eventsBySeverity[SecuritySeverity.MEDIUM]++;
    } else {
      eventsBySeverity[SecuritySeverity.LOW]++;
    }
  });

  return {
    totalEvents: logs.length,
    eventsByType,
    eventsBySeverity,
    recentAlerts: [], // Would be populated from recent alert logs
  };
}

interface SecurityAlert {
  severity: SecuritySeverity;
  type: string;
  message: string;
  details: Record<string, any>;
}
