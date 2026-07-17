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
// Two priority lanes on one semaphore: background work (the approval scan's
// auto-deepening past the first fast pass) can legitimately queue hundreds
// of requests at once. Without this split, that flood sits in front of
// foreground requests (contract metadata, balances, a user-initiated
// action) in strict FIFO order and starves the UI from ever leaving its
// loading state, even though the data it actually needs already came back.
const highQueue: Array<() => void> = [];
const lowQueue: Array<() => void> = [];

async function acquire(priority: "high" | "low") {
  if (active >= GLOBAL_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      (priority === "high" ? highQueue : lowQueue).push(resolve);
    });
  }
  active++;
}

function release() {
  active--;
  const next = highQueue.shift() ?? lowQueue.shift();
  if (next) next();
}

export async function rpcCall<T>(
  fn: () => Promise<T>,
  priority: "high" | "low" = "high",
): Promise<T> {
  await acquire(priority);
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
