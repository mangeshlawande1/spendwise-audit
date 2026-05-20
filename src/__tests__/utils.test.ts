import { formatCurrency, formatCurrencyPrecise } from "@/lib/utils";

// ─── Utils tests ──────────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  test("formats whole dollars with no decimal", () => {
    expect(formatCurrency(500)).toBe("$500");
    expect(formatCurrency(1200)).toBe("$1,200");
    expect(formatCurrency(0)).toBe("$0");
  });

  test("rounds to nearest dollar", () => {
    expect(formatCurrency(99.9)).toBe("$100");
    expect(formatCurrency(99.4)).toBe("$99");
  });
});

describe("formatCurrencyPrecise", () => {
  test("formats with 2 decimal places", () => {
    expect(formatCurrencyPrecise(19.99)).toBe("$19.99");
    expect(formatCurrencyPrecise(100)).toBe("$100.00");
  });
});
