// The public Monad Testnet RPC rate-limits to 25 requests/sec (confirmed by
// hitting it directly during development — error code -32011, "limited to
// 25/sec"). Every read path in this app funnels through this single
// semaphore so concurrent hooks can't collectively blow through that limit,
// and every call gets retried with backoff if it does.
const GLOBAL_CONCURRENCY = 8;
const MAX_RETRIES = 5;

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("limited to") || message.includes("-32011");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let active = 0;
const queue: Array<() => void> = [];

async function acquire() {
  if (active >= GLOBAL_CONCURRENCY) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  active++;
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

export async function rpcCall<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (isRateLimitError(err) && attempt < MAX_RETRIES) {
          await sleep(250 * (attempt + 1) + Math.random() * 150);
          continue;
        }
        throw err;
      }
    }
  } finally {
    release();
  }
}
