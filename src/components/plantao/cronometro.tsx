"use client";

import { useEffect, useState } from "react";

/** "3h 12min" desde o início do plantão, atualizado a cada 30 s. */
export function Cronometro({ desde }: { desde: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const min = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60_000));
  return <>{min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}min` : `${min} min`}</>;
}
