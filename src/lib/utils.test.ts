import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, truncate, humanizeError, cn } from "@/lib/utils";

describe("utils", () => {
  describe("formatCurrency", () => {
    it("formats zero exactly", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("uses extra precision for sub-cent amounts", () => {
      expect(formatCurrency(0.000123)).toBe("$0.000123");
    });

    it("formats normal amounts to 4 decimal places", () => {
      expect(formatCurrency(1.5)).toBe("$1.5000");
    });
  });

  describe("formatNumber", () => {
    it("adds thousands separators", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
    });
  });

  describe("truncate", () => {
    it("leaves short text untouched", () => {
      expect(truncate("hello", 48)).toBe("hello");
    });

    it("truncates long text with an ellipsis and respects max length", () => {
      const long = "a".repeat(100);
      const result = truncate(long, 48);
      expect(result.length).toBe(48);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("cn (class merging)", () => {
    it("merges and dedupes tailwind classes", () => {
      expect(cn("p-2", "p-4")).toBe("p-4");
    });
  });

  describe("humanizeError (failure scenario mapping)", () => {
    it("maps invalid API key / 401 errors", () => {
      expect(humanizeError(new Error("401 Unauthorized: Invalid API key"))).toMatch(/API key appears invalid/);
    });

    it("maps rate limit / 429 errors", () => {
      expect(humanizeError(new Error("Request failed with status code 429"))).toMatch(/too fast/);
    });

    it("maps out-of-credit errors", () => {
      expect(humanizeError(new Error("insufficient credits remaining"))).toMatch(/out of credits/);
    });

    it("maps timeout errors", () => {
      expect(humanizeError(new Error("The operation timed out"))).toMatch(/took too long/);
    });

    it("maps network/connection errors (e.g. Supabase/provider outage)", () => {
      expect(humanizeError(new Error("fetch failed"))).toMatch(/couldn't reach the model provider/);
    });

    it("maps 404 errors", () => {
      expect(humanizeError(new Error("404 Not Found"))).toMatch(/couldn't be found/);
    });

    it("falls back to a generic friendly message for unknown errors, without leaking internals", () => {
      const message = humanizeError(new Error("TypeError: Cannot read property 'x' of undefined at /app/secret/path.ts:42"));
      expect(message).toBe("Something went wrong on our end. Please try again in a moment.");
      expect(message).not.toContain("secret/path.ts");
    });

    it("handles non-Error thrown values without crashing", () => {
      expect(() => humanizeError("plain string error")).not.toThrow();
      expect(() => humanizeError({ some: "object" })).not.toThrow();
    });
  });
});
