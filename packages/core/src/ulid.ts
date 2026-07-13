import { randomFillSync } from 'node:crypto';

const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

/** A small, time-sortable ULID. Good enough for stable node ids. */
export function ulid(time = Date.now()): string {
  let t = time;
  let ts = '';
  for (let i = 0; i < 10; i++) {
    ts = ENC[t % 32] + ts;
    t = Math.floor(t / 32);
  }
  const bytes = randomFillSync(new Uint8Array(16));
  let rand = '';
  for (let i = 0; i < 16; i++) rand += ENC[bytes[i]! % 32];
  return ts + rand;
}
