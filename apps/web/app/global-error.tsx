"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error";
import "./globals.css";

/** The last resort, when even the app's frame fails to draw: reported (decision 0027) with a way to reload. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportClientError("app", error, error.digest);
  }, [error]);
  const es = typeof navigator !== "undefined" && navigator.language.startsWith("es");
  return (
    <html lang={es ? "es" : "en"}>
      <body className="grid min-h-dvh place-items-center bg-page px-6 font-sans text-ink">
        <div role="alert" className="w-full max-w-md space-y-4 text-center">
          <h1 className="font-display text-[32px] leading-tight">{es ? "Esta pantalla tuvo un problema" : "This screen hit a problem"}</h1>
          <button type="button" className="liquid-glass liquid-glass-accent min-h-[52px] w-full rounded-full px-6 text-[17px] font-semibold" onClick={() => location.reload()}>
            {es ? "Cargar de nuevo" : "Reload"}
          </button>
          <p data-testid="error-details" className="pt-2 text-[12px] break-words text-muted select-all">
            {error.name}: {error.message || "—"}{error.digest ? ` · ${error.digest}` : ""}
          </p>
        </div>
      </body>
    </html>
  );
}
