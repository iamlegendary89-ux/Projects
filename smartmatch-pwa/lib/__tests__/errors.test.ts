import { describe, it, expect, beforeEach } from "vitest";
import {
    PipelineError,
    DiscoveryError,
    EnrichmentError,
    SyncError,
    ErrorHandler,
    ERROR_SEVERITY,
    ERROR_CATEGORY,
    classifyErrorForRetry,
    createError,
} from "../errors";

describe("PipelineError", () => {
    it("should create error with default options", () => {
        const error = new PipelineError("Something went wrong");

        expect(error.message).toBe("Something went wrong");
        expect(error.phase).toBe("unknown");
        expect(error.category).toBe(ERROR_CATEGORY.UNKNOWN);
        expect(error.severity).toBe(ERROR_SEVERITY.MEDIUM);
        expect(error.retryable).toBe(true);
        expect(error.timestamp).toBeDefined();
    });

    it("should create error with custom options", () => {
        const error = new PipelineError("API failed", {
            phase: "discovery",
            category: ERROR_CATEGORY.API,
            severity: ERROR_SEVERITY.HIGH,
            retryable: false,
            context: { phoneId: "apple-iphone-15" },
        });

        expect(error.phase).toBe("discovery");
        expect(error.category).toBe(ERROR_CATEGORY.API);
        expect(error.severity).toBe(ERROR_SEVERITY.HIGH);
        expect(error.retryable).toBe(false);
        expect(error.context["phoneId"]).toBe("apple-iphone-15");
    });

    it("should serialize to JSON", () => {
        const error = new PipelineError("Test error", {
            phase: "sync",
            category: ERROR_CATEGORY.DATABASE,
        });

        const json = error.toJSON();

        expect(json["message"]).toBe("Test error");
        expect(json["phase"]).toBe("sync");
        expect(json["category"]).toBe(ERROR_CATEGORY.DATABASE);
        expect(json["timestamp"]).toBeDefined();
        expect(json["stack"]).toBeDefined();
    });

    it("should generate user-friendly message", () => {
        const error = new PipelineError("Connection failed", {
            phase: "sync",
            suggestedRecovery: "Check database connectivity",
            context: { phoneId: "samsung-galaxy-s24" },
        });

        const message = error.toUserMessage();

        expect(message).toContain("SYNC ERROR");
        expect(message).toContain("Connection failed");
        expect(message).toContain("Suggested recovery");
        expect(message).toContain("samsung-galaxy-s24");
    });
});

describe("Phase-specific errors", () => {
    it("DiscoveryError should have correct defaults", () => {
        const error = new DiscoveryError("CSE quota exceeded");

        expect(error.name).toBe("DiscoveryError");
        expect(error.phase).toBe("discovery");
        expect(error.category).toBe(ERROR_CATEGORY.API);
        expect(error.severity).toBe(ERROR_SEVERITY.MEDIUM);
        expect(error.suggestedRecovery).toContain("API quotas");
    });

    it("EnrichmentError should have correct defaults", () => {
        const error = new EnrichmentError("AI model unavailable");

        expect(error.name).toBe("EnrichmentError");
        expect(error.phase).toBe("enrichment");
        expect(error.category).toBe(ERROR_CATEGORY.API);
        expect(error.severity).toBe(ERROR_SEVERITY.HIGH);
        expect(error.suggestedRecovery).toContain("AI API");
    });

    it("SyncError should have correct defaults", () => {
        const error = new SyncError("Supabase connection failed");

        expect(error.name).toBe("SyncError");
        expect(error.phase).toBe("sync");
        expect(error.category).toBe(ERROR_CATEGORY.DATABASE);
        expect(error.severity).toBe(ERROR_SEVERITY.CRITICAL);
        expect(error.suggestedRecovery).toContain("database connectivity");
    });
});

describe("ErrorHandler", () => {
    let handler: ErrorHandler;

    beforeEach(() => {
        handler = new ErrorHandler("test-run-123");
    });

    it("should start with no errors", () => {
        expect(handler.errors).toHaveLength(0);
        expect(handler.runId).toBe("test-run-123");
    });

    it("should handle and track errors", () => {
        const error1 = new Error("Regular error");
        const error2 = new PipelineError("Pipeline error");

        handler.handle(error1, { phase: "discovery" });
        handler.handle(error2, { phase: "enrichment" });

        expect(handler.errors).toHaveLength(2);
    });

    it("should convert regular errors to PipelineError", () => {
        const regularError = new Error("Simple error");
        const result = handler.handle(regularError, { phase: "sync" });

        expect(result).toBeInstanceOf(PipelineError);
        expect(result.phase).toBe("sync");
    });

    it("should detect critical errors", () => {
        expect(handler.hasCriticalErrors()).toBe(false);

        handler.handle(new PipelineError("Critical!", { severity: ERROR_SEVERITY.CRITICAL }));

        expect(handler.hasCriticalErrors()).toBe(true);
    });

    it("should generate summary statistics", () => {
        handler.handle(new DiscoveryError("Error 1"));
        handler.handle(new DiscoveryError("Error 2"));
        handler.handle(new EnrichmentError("Error 3"));
        handler.handle(new SyncError("Error 4"));

        const summary = handler.getSummary();

        expect(summary.total).toBe(4);
        expect(summary.byPhase["discovery"]).toBe(2);
        expect(summary.byPhase["enrichment"]).toBe(1);
        expect(summary.byPhase["sync"]).toBe(1);
        expect(summary.critical).toBe(1); // SyncError is critical
    });

    it("should generate summary table", () => {
        handler.handle(new DiscoveryError("Test error"));
        const table = handler.generateSummaryTable();

        expect(table).toContain("ERROR SUMMARY");
        expect(table).toContain("Total Errors: 1");
        expect(table).toContain("discovery");
    });

    it("should return correct exit codes", () => {
        expect(handler.getExitCode()).toBe(0); // No errors

        handler.handle(new DiscoveryError("Non-critical"));
        expect(handler.getExitCode()).toBe(2); // Non-critical errors

        handler.handle(new SyncError("Critical error"));
        expect(handler.getExitCode()).toBe(1); // Critical errors
    });
});

describe("createError", () => {
    it("should create DiscoveryError for type 'discovery'", () => {
        const error = createError("discovery", "CSE failed");
        expect(error).toBeInstanceOf(DiscoveryError);
    });

    it("should create EnrichmentError for type 'enrichment'", () => {
        const error = createError("enrichment", "AI failed");
        expect(error).toBeInstanceOf(EnrichmentError);
    });

    it("should create SyncError for type 'sync'", () => {
        const error = createError("sync", "DB failed");
        expect(error).toBeInstanceOf(SyncError);
    });

    it("should create PipelineError for unknown type", () => {
        const error = createError("unknown", "Generic error");
        expect(error).toBeInstanceOf(PipelineError);
        expect(error).not.toBeInstanceOf(DiscoveryError);
    });
});

describe("classifyErrorForRetry", () => {
    it("should classify network errors as retryable", () => {
        const result = classifyErrorForRetry({ code: "ENOTFOUND" });
        expect(result.retryable).toBe(true);
        expect(result.category).toBe(ERROR_CATEGORY.NETWORK);
    });

    it("should classify timeout errors as retryable", () => {
        const result = classifyErrorForRetry({ message: "Request timeout" });
        expect(result.retryable).toBe(true);
        expect(result.category).toBe(ERROR_CATEGORY.TIMEOUT);
    });

    it("should classify rate limit errors with delay multiplier", () => {
        const result = classifyErrorForRetry({ status: 429 });
        expect(result.retryable).toBe(true);
        expect(result.category).toBe(ERROR_CATEGORY.QUOTA);
        expect(result.delayMultiplier).toBe(5);
    });

    it("should classify server errors as retryable", () => {
        const result = classifyErrorForRetry({ status: 500 });
        expect(result.retryable).toBe(true);
        expect(result.category).toBe(ERROR_CATEGORY.API);
    });

    it("should classify auth errors as NOT retryable", () => {
        const result = classifyErrorForRetry({ status: 401 });
        expect(result.retryable).toBe(false);
        expect(result.category).toBe(ERROR_CATEGORY.AUTHENTICATION);
    });

    it("should classify validation errors as NOT retryable", () => {
        const result = classifyErrorForRetry({ status: 400, message: "Validation failed" });
        expect(result.retryable).toBe(false);
        expect(result.category).toBe(ERROR_CATEGORY.VALIDATION);
    });

    it("should classify database errors as retryable", () => {
        const result = classifyErrorForRetry({ message: "Supabase query failed" });
        expect(result.retryable).toBe(true);
        expect(result.category).toBe(ERROR_CATEGORY.DATABASE);
    });
});
