/**
 * Mock for nanoid — the real package is ESM-only and incompatible with
 * Jest's CommonJS runtime. This mock returns a counter-based ID so tests
 * get unique, predictable values without needing the real ESM module.
 */
let counter = 0;

export function nanoid(size = 21): string {
  counter += 1;
  return `test_id_${String(counter).padStart(size - 8, "0")}`;
}

// Reset counter between test files
beforeEach(() => {
  counter = 0;
});