"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error";
import "./globals.css";

/** The last resort, when even the app's frame fails to draw: reported (decision 0027) with a way to reload. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => reportClientError("app", error, error.digest), [error]);
  const es = typeof navigator !== "undefined" && navigator.language.startsWith("es");
  return (
    <html lang={es ? "es" : "en"}>
      <body className="grid min-h-dvh place-items-center bg-ground px-6 text-ink">
        <div role="alert" className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-[22px] font-bold">{es ? "Esta pantalla tuvo un problema" : "This screen hit a problem"}</h1>
          <button type="button" className="min-h-[52px] w-full rounded-full bg-brand px-6 text-[17px] font-semibold text-white" onClick={() => location.reload()}>
            {es ? "Cargar de nuevo" : "Reload"}
          </button>
        </div>
      </body>
    </html>
  );
}
