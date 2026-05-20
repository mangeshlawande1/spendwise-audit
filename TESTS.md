# Tests

## How to Run

```bash
npm test                   # run all tests once
npm run test:watch         # watch mode
npm test -- --coverage     # with coverage report
```

---

## Test Files

### `src/__tests__/audit-engine.test.ts`

Core audit engine unit tests. These run entirely in-memory with no network calls, no database, no API keys required.

| Test | What It Covers |
|---|---|
| Cursor Business → Pro downgrade (team < 5) | Verifies the engine correctly recommends a plan downgrade when a small team is on Cursor Business and identifies the exact dollar savings |
| Excess seat detection | Verifies that `seats > teamSize` triggers a `reduce_seats` recommendation with correct savings math |
| Claude Team → Pro for < 5 users | Verifies the 5-seat minimum rule for Claude Team is enforced and the savings calculation is correct |
| Optimal detection — no fake savings | Verifies the engine returns `optimal` and `$0 savings` for a perfectly matched plan — no manufactured recommendations |
| Savings tier: `high` at ≥ $500/mo | Verifies the `savingsTier` classification logic at the high threshold |
| Savings tier: `optimal` at $0 | Verifies the `savingsTier` classification for zero-savings audits |
| Annual savings = monthly × 12 | Verifies the savings math integrity — annual is always exactly 12× monthly |

---

### `src/__tests__/audit-engine-extended.test.ts`

Additional audit engine tests covering multi-tool scenarios and edge cases.

| Test | What It Covers |
|---|---|
| Multi-tool savings sum | Verifies total savings correctly adds across 2 tools with independent recommendations |
| ChatGPT Team → Plus for solo user | Verifies small-team downgrade rule for ChatGPT |
| Coding team on ChatGPT Plus → Cursor | Verifies use-case-based tool switch recommendation |
| Windsurf Teams → Pro for small team | Verifies Windsurf min-seat rule |
| Unique nanoid per audit | Verifies every audit gets a distinct ID |

### `src/__tests__/utils.test.ts`

Unit tests for formatting utilities.

| Test | What It Covers |
|---|---|
| `formatCurrency` whole dollars | No decimal for round numbers, correct comma formatting |
| `formatCurrency` rounding | Rounds to nearest dollar correctly |
| `formatCurrencyPrecise` decimals | Always shows 2 decimal places |

### `src/__tests__/day4-5.test.ts`

Tests for AI summary fallback logic and IP hashing utility.

| Test | What It Covers |
|---|---|
| Fallback summary mentions savings amount | `$60` and `$720` appear in summary for a $60/mo savings audit |
| Fallback summary mentions top tool | Top saving tool name appears in the summary |
| Optimal audit gets positive messaging | "well-optimis" or "no action" language for zero-savings audits |
| Summary is a non-empty string | Fallback always returns a usable string >50 chars |
| hashIP returns 64-char hex | SHA-256 output format correct |
| Same IP always produces same hash | Determinism verified |
| Different IPs produce different hashes | Hash uniqueness verified |
| "unknown" IP handled gracefully | No crash on missing IP |
