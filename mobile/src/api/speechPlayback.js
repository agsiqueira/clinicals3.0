// One audio owner across patient and mentor channels. Cancellation invalidates
// pending work synchronously, before asynchronous native cleanup finishes.
let active = null;
let reserved = null;
let boundary = 0;
let cleanupPending = Promise.resolve();
function cancel(previous) {
  if (!previous) return;
  const cleanup = previous.cancel();
  cleanupPending = Promise.all([cleanupPending, cleanup]).then(() => {}).catch(() => {});
}
export function createSpeechPlaybackOwner(onCancel) {
  const owner = {};
  const seen = new Set();
  let revision = 0;
  function stop() {
    revision++;
    if (active?.owner !== owner) return;
    const previous = active;
    active = null;
    cancel(previous);
  }
  function begin(turnId) {
    if ((reserved && reserved !== owner) || !turnId || seen.has(turnId)) return null;
    seen.add(turnId);
    const previous = active;
    active = null;
    cancel(previous);
    const lease = { owner, cancel: () => { revision++; return onCancel(); } };
    active = lease;
    return { ready: cleanupPending, isCurrent: () => active === lease, finish: () => { if (active === lease) stop(); } };
  }
  function reserve() {
    if (reserved !== owner) boundary++;
    reserved = owner;
    if (active && active.owner !== owner) {
      const previous = active;
      active = null;
      cancel(previous);
    }
  }
  function release() { if (reserved === owner) reserved = null; }
  function capture() { const expected = revision; const expectedBoundary = boundary; return () => revision === expected && boundary === expectedBoundary; }
  return { begin, stop, reserve, release, capture };
}
