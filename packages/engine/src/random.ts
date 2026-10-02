/** Seeded randomness so every session is reproducible from its stored seed (spec 10.3 item 6). */

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for surface variation. Not for security. */
export function rng(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLDEN = 0.6180339887498949;

/**
 * The exit draw for a rep's k-th attempt at a scenario (decision 0005): a golden-ratio sequence offset by a
 * per-rep secret, so configured exit rates hold over small samples without being predictable.
 */
export function exitDrawFor(repSecret: string, scenarioCode: string, attempt: number): number {
  const offset = hashSeed(`${repSecret}:${scenarioCode}`) / 4294967296;
  return (offset + attempt * GOLDEN) % 1;
}

export function pick<T>(items: readonly T[], next: () => number): T {
  if (items.length === 0) throw new Error("pick from an empty list");
  return items[Math.floor(next() * items.length)]!;
}
