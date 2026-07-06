import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { subscribeNetwork } from "@/lib/native";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    subscribeNetwork(({ connected }) => setOnline(connected)).then((c) => (cleanup = c));
    return () => cleanup?.();
  }, []);

  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <WifiOff className="h-3.5 w-3.5" />
      You're offline — showing cached data. Changes will sync when you reconnect.
    </div>
  );
}
