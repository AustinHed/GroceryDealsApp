"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type ScrapeState = "idle" | "running" | "succeeded" | "failed";

export function KrogerDealsTester() {
  const [storeId, setStoreId] = useState("");
  const [state, setState] = useState<ScrapeState>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function runScrape(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("running");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/scrape-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: "kroger", storeId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Scrape failed.");
      }

      setResult(payload);
      setState("succeeded");
    } catch (scrapeError) {
      setError(scrapeError instanceof Error ? scrapeError.message : "Scrape failed.");
      setState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 pb-12 pt-24 text-[#181d26] sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-[#dfe3dc] bg-white p-5 shadow-[0_16px_44px_rgba(24,29,38,0.07)]">
          <h1 className="text-2xl font-semibold tracking-normal">Kroger weekly ad scrape</h1>
          <form onSubmit={runScrape} className="mt-6 grid gap-4">
            <label htmlFor="storeId" className="text-sm font-semibold text-[#3d4450]">
              Kroger store ID
            </label>
            <input
              id="storeId"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              placeholder="Enter store ID"
              className="w-full rounded-md border border-[#cfd5cf] bg-white px-3 py-3 text-base outline-none transition focus:border-[#4f7d5a] focus:ring-2 focus:ring-[#b8d6bd]"
              required
            />
            <button
              type="submit"
              disabled={state === "running" || !storeId.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#1f4d2a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173b20] disabled:cursor-not-allowed disabled:bg-[#9aa79c]"
            >
              <Search aria-hidden="true" className="size-4" />
              {state === "running" ? "scraping" : "scrape"}
            </button>
          </form>

          {state === "running" ? (
            <p className="mt-5 rounded-md border border-[#d9dde5] bg-[#f8fafc] p-3 text-sm text-[#3d4450]">
              Fetching Kroger weekly ad deals server-side...
            </p>
          ) : null}

          {state === "failed" ? (
            <p className="mt-5 rounded-md border border-[#efb8b8] bg-[#fff5f5] p-3 text-sm font-medium text-[#8a1f1f]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-[560px] rounded-lg border border-[#dfe3dc] bg-[#111827] p-4 shadow-[0_16px_44px_rgba(24,29,38,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[#d1d5db]">
            <span>JSON results</span>
            <span>{state}</span>
          </div>
          <pre className="max-h-[calc(100vh-180px)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#0b1020] p-4 font-mono text-sm leading-6 text-[#e5e7eb]">
            {result ? JSON.stringify(result, null, 2) : "{\n  \"deals\": []\n}"}
          </pre>
        </div>
      </section>
    </main>
  );
}
