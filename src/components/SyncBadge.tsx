import { useEffect, useState, useRef } from "react";

interface Props {
  editTimestamp: number | null;
  siteId: string;
}

type SyncState = "idle" | "syncing" | "done";

export default function SyncBadge({ editTimestamp, siteId }: Props) {
  const [state, setState] = useState<SyncState>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!editTimestamp || !siteId) {
      setState("idle");
      return;
    }

    setState("syncing");

    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000;

    const poll = async () => {
      if (Date.now() - startTime > maxDuration) {
        setState("idle");
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      try {
        const res = await fetch(
          `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
        );
        if (!res.ok) return;
        const deploys = await res.json();
        if (deploys.length > 0) {
          const latest = deploys[0];
          const deployTime = new Date(latest.created_at).getTime();
          if (deployTime > editTimestamp && latest.state === "ready") {
            setState("done");
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimeout(() => setState("idle"), 3000);
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    intervalRef.current = setInterval(poll, 10000);
    poll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [editTimestamp, siteId]);

  if (state === "idle") return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {state === "syncing" && (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400">Syncing...</span>
        </>
      )}
      {state === "done" && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-green-400">Updated!</span>
        </>
      )}
    </div>
  );
}
