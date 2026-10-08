// Browser owners share cancellation; this does not revoke a credential already held by a vendor.
const cancellations = new Set<() => void>();
export function onRemoteCancel(cancel: () => void) { cancellations.add(cancel); return () => { cancellations.delete(cancel); }; }
export function cancelRemoteLearning() { for (const cancel of [...cancellations]) cancel(); }

/** A cooperating browser checks its app lease; an unreadable answer fails closed. */
export function watchCapability(f: typeof fetch, id: string) {
  let live = true, checking = false;
  const stop = () => { live = false; clearInterval(timer); off(); };
  const off = onRemoteCancel(() => stop());
  const timer = setInterval(async () => {
    if (!live || checking) return;
    checking = true;
    try {
      const response = await f(`/api/authority/capability?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const answer = response.ok ? await response.json() : null;
      if (live && answer?.active !== true) cancelRemoteLearning();
    } catch { if (live) cancelRemoteLearning(); }
    finally { checking = false; }
  }, 1000);
  return stop;
}
