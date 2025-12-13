import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    withRetry,
    CircuitBreaker,
    CircuitBreakerRegistry,
    classifyError,
    defaultShouldRetry,
} from "../retry";

describe("withRetry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should return result on first success", async () => {
        const fn = vi.fn().mockResolvedValue("success");

        const resultPromise = withRetry(fn, { maxRetries: 3 });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed eventually", async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("fail1"))
            .mockRejectedValueOnce(new Error("fail2"))
            .mockResolvedValue("success");

        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 100,
        });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries exhausted", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("always fail"));

        const resultPromise = withRetry(fn, {
            maxRetries: 2,
            baseDelayMs: 100,
        });

        await vi.runAllTimersAsync();
        await expect(resultPromise).rejects.toThrow("always fail");
        expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("should call onRetry callback on each retry", async () => {
        const onRetry = vi.fn();
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValue("success");

        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 100,
            onRetry,
        });
        await vi.runAllTimersAsync();
        await resultPromise;

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(
            expect.any(Error),
            1, // attempt
            3, // maxRetries
            expect.any(Number) // delay
        );
    });

    it("should respect shouldRetry option", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("non-retryable"));
        const shouldRetry = vi.fn().mockReturnValue(false);

        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            shouldRetry,
        });

        await expect(resultPromise).rejects.toThrow("non-retryable");
        expect(fn).toHaveBeenCalledTimes(1);
        expect(shouldRetry).toHaveBeenCalled();
    });
});

describe("CircuitBreaker", () => {
    it("should start in CLOSED state", () => {
        const cb = new CircuitBreaker();
        expect(cb.state).toBe("CLOSED");
        expect(cb.getStatus().isAvailable).toBe(true);
    });

    it("should open after reaching failure threshold", () => {
        const cb = new CircuitBreaker({ failureThreshold: 3 });

        for (let i = 0; i < 3; i++) {
            cb.onFailure();
        }

        expect(cb.state).toBe("OPEN");
        expect(cb.getStatus().isAvailable).toBe(false);
    });

    it("should transition to HALF_OPEN after recovery timeout", async () => {
        vi.useFakeTimers();
        const cb = new CircuitBreaker({
            failureThreshold: 2,
            recoveryTimeout: 1000,
        });

        // Open the circuit
        cb.onFailure();
        cb.onFailure();
        expect(cb.state).toBe("OPEN");

        // Advance time past recovery timeout
        vi.advanceTimersByTime(1100);

        // Execute should transition to HALF_OPEN
        const mockFn = vi.fn().mockResolvedValue("success");
        await cb.execute(mockFn);

        expect(cb.state).toBe("HALF_OPEN");
        vi.useRealTimers();
    });

    it("should close after reaching success threshold in HALF_OPEN", async () => {
        const cb = new CircuitBreaker({
            failureThreshold: 2,
            successThreshold: 2,
            recoveryTimeout: 0,
        });

        // Open the circuit
        cb.onFailure();
        cb.onFailure();
        expect(cb.state).toBe("OPEN");

        // Manually set to HALF_OPEN for testing
        cb.state = "HALF_OPEN";

        // Succeed twice
        cb.onSuccess();
        expect(cb.state).toBe("HALF_OPEN");
        cb.onSuccess();
        expect(cb.state).toBe("CLOSED");
    });

    it("should reset properly", () => {
        const cb = new CircuitBreaker({ failureThreshold: 2 });

        cb.onFailure();
        cb.onFailure();
        expect(cb.state).toBe("OPEN");

        cb.reset();
        expect(cb.state).toBe("CLOSED");
        expect(cb.failureCount).toBe(0);
        expect(cb.successCount).toBe(0);
    });
});

describe("CircuitBreakerRegistry", () => {
    it("should create and retrieve breakers", () => {
        const registry = new CircuitBreakerRegistry();
        const breaker1 = registry.getBreaker("service1");
        const breaker2 = registry.getBreaker("service2");

        expect(breaker1).toBeInstanceOf(CircuitBreaker);
        expect(breaker2).toBeInstanceOf(CircuitBreaker);
        expect(breaker1).not.toBe(breaker2);
    });

    it("should return same breaker for same service name", () => {
        const registry = new CircuitBreakerRegistry();
        const breaker1 = registry.getBreaker("service1");
        const breaker2 = registry.getBreaker("service1");

        expect(breaker1).toBe(breaker2);
    });

    it("should get all statuses", () => {
        const registry = new CircuitBreakerRegistry();
        registry.getBreaker("service1");
        registry.getBreaker("service2");

        const statuses = registry.getAllStatus();
        expect(Object.keys(statuses)).toHaveLength(2);
        expect(statuses["service1"]).toBeDefined();
        expect(statuses["service2"]).toBeDefined();
    });

    it("should reset all breakers", () => {
        const registry = new CircuitBreakerRegistry();
        const breaker1 = registry.getBreaker("service1", { failureThreshold: 1 });
        const breaker2 = registry.getBreaker("service2", { failureThreshold: 1 });

        breaker1.onFailure();
        breaker2.onFailure();
        expect(breaker1.state).toBe("OPEN");
        expect(breaker2.state).toBe("OPEN");

        registry.resetAll();
        expect(breaker1.state).toBe("CLOSED");
        expect(breaker2.state).toBe("CLOSED");
    });

    it("should get stats", () => {
        const registry = new CircuitBreakerRegistry();
        registry.getBreaker("closed1");
        const openBreaker = registry.getBreaker("open1", { failureThreshold: 1 });
        openBreaker.onFailure();

        const stats = registry.getStats();
        expect(stats["total"]).toBe(2);
        expect(stats["closed"]).toBe(1);
        expect(stats["open"]).toBe(1);
    });
});

describe("classifyError", () => {
    it("should classify network errors", () => {
        expect(classifyError({ code: "ENOTFOUND" })).toBe("NETWORK");
        expect(classifyError({ code: "ECONNREFUSED" })).toBe("NETWORK");
        expect(classifyError({ message: "Network error" })).toBe("NETWORK");
    });

    it("should classify timeout errors", () => {
        expect(classifyError({ code: "ETIMEDOUT" })).toBe("TIMEOUT");
        expect(classifyError({ message: "Request timeout" })).toBe("TIMEOUT");
    });

    it("should classify rate limit errors", () => {
        expect(classifyError({ status: 429 })).toBe("RATE_LIMIT");
        expect(classifyError({ message: "Rate limit exceeded" })).toBe("RATE_LIMIT");
    });

    it("should classify authentication errors", () => {
        expect(classifyError({ status: 401 })).toBe("AUTHENTICATION");
        expect(classifyError({ message: "Unauthorized access" })).toBe("AUTHENTICATION");
    });

    it("should classify server errors", () => {
        expect(classifyError({ status: 500 })).toBe("SERVER_ERROR");
        expect(classifyError({ status: 503 })).toBe("SERVER_ERROR");
    });

    it("should classify database errors", () => {
        expect(classifyError({ message: "Database connection failed" })).toBe("DATABASE");
        expect(classifyError({ message: "Supabase error" })).toBe("DATABASE");
    });

    it("should return UNKNOWN for unclassified errors", () => {
        expect(classifyError({})).toBe("UNKNOWN");
        expect(classifyError({ message: "Something happened" })).toBe("UNKNOWN");
    });
});

describe("defaultShouldRetry", () => {
    it("should retry network errors", () => {
        expect(defaultShouldRetry({ code: "ENOTFOUND" })).toBe(true);
    });

    it("should retry timeout errors", () => {
        expect(defaultShouldRetry({ code: "ETIMEDOUT" })).toBe(true);
    });

    it("should retry rate limit errors", () => {
        expect(defaultShouldRetry({ status: 429 })).toBe(true);
    });

    it("should retry server errors", () => {
        expect(defaultShouldRetry({ status: 500 })).toBe(true);
    });

    it("should NOT retry authentication errors", () => {
        expect(defaultShouldRetry({ status: 401 })).toBe(false);
    });

    it("should NOT retry not found errors", () => {
        expect(defaultShouldRetry({ status: 404 })).toBe(false);
    });

    it("should NOT retry client errors", () => {
        expect(defaultShouldRetry({ status: 400 })).toBe(false);
    });
});
