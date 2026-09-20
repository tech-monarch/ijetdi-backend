import { createWorker } from "tesseract.js";

// A fresh worker per call, not a persistent pool — this is a low-frequency
// admin action (document import), not a hot request path. A persistent
// pool would add real lifecycle-management complexity (idle timeout,
// crash recovery, concurrency limits) for a workload that doesn't need
// it. Deliberate choice — don't revisit without a real reason (e.g. this
// endpoint becoming a hot path, which isn't its intended use).
//
// Tesseract.js downloads English language data from a CDN on first run
// in a given environment, then caches it — this will fail with no
// network access to that CDN (expected in some sandboxed environments;
// see backend/README.md's "Known verification gaps" section). Works
// normally in a real deployed environment with normal internet access.
// Hard ceiling on a single OCR pass (worker init + recognition). Confirmed
// for real: a blocked-network worker-init failure, once the crash below is
// suppressed, doesn't reject quickly — tesseract.js's underlying
// fetch/retry logic keeps trying for a long time before giving up on its
// own. Without a timeout of this module's own, one stuck page could hang
// the entire synchronous import request well past anything a client would
// wait for. 45s is generous for a real recognition pass on one page.
const OCR_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function recognizeImageBuffer(buffer: Buffer): Promise<string> {
  // createWorker's second failure path: when worker initialization fails
  // (e.g. no network access to fetch language data) with no `errorHandler`
  // configured, tesseract.js both rejects the returned promise AND
  // separately throws inside an internal message-event listener — an
  // uncaught exception that crashes the whole Node process, bypassing
  // this function's own try/catch entirely. Confirmed for real: without
  // the errorHandler below, a blocked-network failure here took down the
  // entire process rather than surfacing as a caught rejection. Passing a
  // no-op errorHandler suppresses that second throw path; the real error
  // still reaches the caller normally via the rejected `createWorker()`
  // promise, which the try/catch below (via withTimeout) does catch.
  const worker = await withTimeout(
    createWorker("eng", undefined, { errorHandler: () => {} }),
    OCR_TIMEOUT_MS,
    "OCR worker failed to initialize in time (this can happen with no network access to fetch language data).",
  );
  try {
    const { data } = await withTimeout(worker.recognize(buffer), OCR_TIMEOUT_MS, "OCR recognition timed out.");
    return data.text;
  } finally {
    await worker.terminate().catch(() => {
      // Best-effort cleanup — if terminate itself fails (e.g. the worker
      // never fully initialized), there's nothing more useful to do than
      // let the caller's own error (already thrown/returned above) stand.
    });
  }
}
