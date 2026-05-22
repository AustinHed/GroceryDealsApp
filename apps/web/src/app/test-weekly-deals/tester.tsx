"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import type { SupportedStoreChain, WeeklyDealsResponse } from "@grocery-deals/shared";

type RequestState = "idle" | "running" | "succeeded" | "failed";

type StoreRow = {
  company: SupportedStoreChain;
  label: string;
  placeholder: string;
  storeId: string;
};

const STORE_ROWS: StoreRow[] = [
  { company: "kroger", label: "Kroger", placeholder: "01400413", storeId: "" },
  { company: "marianos", label: "Mariano's", placeholder: "53100531", storeId: "" },
];

const EMPTY_RESULT = {
  requestedAt: "",
  results: [],
  dealCount: 0,
};

export function WeeklyDealsTester() {
  const [rows, setRows] = useState<StoreRow[]>(STORE_ROWS);
  const [state, setState] = useState<RequestState>("idle");
  const [result, setResult] = useState<WeeklyDealsResponse | null>(null);
  const [activeResultKey, setActiveResultKey] = useState("");
  const [error, setError] = useState("");

  const requestStores = useMemo(
    () =>
      rows
        .map((row) => ({
          company: row.company,
          storeId: row.storeId.trim(),
        }))
        .filter((row) => row.storeId),
    [rows],
  );
  const selectedCount = requestStores.length;
  const canSubmit = state !== "running" && selectedCount > 0 && selectedCount <= 3;
  const activeResult =
    result?.results.find((storeResult) => `${storeResult.company}-${storeResult.storeId}` === activeResultKey) ??
    result?.results[0];
  const activeFields = useMemo(() => {
    if (activeResult?.status !== "succeeded") return [];

    const fields = new Set<string>();
    activeResult.deals.forEach((deal) => Object.keys(deal).forEach((field) => fields.add(field)));

    return [...fields].sort();
  }, [activeResult]);

  function updateStoreId(company: SupportedStoreChain, storeId: string) {
    setRows((currentRows) => currentRows.map((row) => (row.company === company ? { ...row, storeId } : row)));
  }

  async function runCoordinator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("running");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/weekly-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stores: requestStores }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Weekly deals coordinator failed.");
      }

      setResult(payload);
      if (payload.results?.[0]) {
        setActiveResultKey(`${payload.results[0].company}-${payload.results[0].storeId}`);
      }
      setState("succeeded");
    } catch (coordinatorError) {
      setError(coordinatorError instanceof Error ? coordinatorError.message : "Weekly deals coordinator failed.");
      setState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 pb-12 pt-24 text-[#181d26] sm:px-8">
      <section className="mx-auto grid w-full max-w-7xl gap-7 lg:grid-cols-[430px_minmax(0,1fr)_260px]">
        <div className="rounded-lg border border-[#dfe3dc] bg-white p-5 shadow-[0_16px_44px_rgba(24,29,38,0.07)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Weekly ad deals</h1>
            </div>
            <span className="rounded-md border border-[#dfe3dc] px-2.5 py-1 font-mono text-xs text-[#596170]">
              {selectedCount}/3
            </span>
          </div>

          <form onSubmit={runCoordinator} className="mt-6 grid gap-4">
            <div className="grid gap-3">
              {rows.map((row) => (
                <div key={row.company} className="grid gap-3 rounded-lg border border-[#e2e6df] bg-[#fbfcf8] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#3d4450]">{row.label}</span>
                    <span className="font-mono text-xs text-[#717987]">{row.company}</span>
                  </div>

                  <label className="grid gap-1.5 text-sm font-semibold text-[#3d4450]">
                    Store ID
                    <input
                      value={row.storeId}
                      onChange={(event) => updateStoreId(row.company, event.target.value)}
                      placeholder={row.placeholder}
                      className="h-11 rounded-md border border-[#cfd5cf] bg-white px-3 text-base outline-none transition focus:border-[#4f7d5a] focus:ring-2 focus:ring-[#b8d6bd]"
                    />
                  </label>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#1f4d2a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173b20] disabled:cursor-not-allowed disabled:bg-[#9aa79c]"
            >
              <Search aria-hidden="true" className="size-4" />
              {state === "running" ? "Scraping" : "Scrape"}
            </button>
          </form>

          {selectedCount > 3 ? (
            <p className="mt-5 rounded-md border border-[#efd9a8] bg-[#fffaf0] p-3 text-sm font-medium text-[#79560f]">
              Enter store IDs for up to 3 chains per scrape.
            </p>
          ) : null}

          {state === "running" ? (
            <p className="mt-5 rounded-md border border-[#d9dde5] bg-[#f8fafc] p-3 text-sm text-[#3d4450]">
              Running coordinator...
            </p>
          ) : null}

          {state === "failed" ? (
            <p className="mt-5 rounded-md border border-[#efb8b8] bg-[#fff5f5] p-3 text-sm font-medium text-[#8a1f1f]">
              {error}
            </p>
          ) : null}

          {result?.results.length ? (
            <div className="mt-5 grid gap-2">
              {result.results.map((storeResult) => (
                <div
                  key={`${storeResult.company}-${storeResult.storeId}`}
                  className="flex items-start gap-3 rounded-md border border-[#dfe3dc] bg-white p-3 text-sm"
                >
                  {storeResult.status === "succeeded" ? (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#247342]" />
                  ) : (
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#a94816]" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[#243044]">
                      {storeResult.company} / {storeResult.storeId}
                    </p>
                    <p className="mt-1 text-[#596170]">
                      {storeResult.status === "succeeded"
                        ? `${storeResult.dealCount} deals returned`
                        : `Failed after retry: ${storeResult.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-[620px] rounded-lg border border-[#dfe3dc] bg-[#111827] p-4 shadow-[0_16px_44px_rgba(24,29,38,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[#d1d5db]">
              <span>JSON results</span>
              <span>{state}</span>
            </div>
          {result?.results.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {result.results.map((storeResult) => {
                const resultKey = `${storeResult.company}-${storeResult.storeId}`;

                return (
                  <button
                    key={resultKey}
                    type="button"
                    onClick={() => setActiveResultKey(resultKey)}
                    className={`rounded-md border px-3 py-1.5 font-mono text-xs transition ${
                      activeResultKey === resultKey
                        ? "border-[#a8d8c4] bg-[#e9fff4] text-[#12331d]"
                        : "border-[#374151] bg-[#172033] text-[#d1d5db] hover:border-[#687386]"
                    }`}
                  >
                    {storeResult.company}/{storeResult.storeId}
                  </button>
                );
              })}
            </div>
          ) : null}
          <pre className="max-h-[calc(100vh-180px)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#0b1020] p-4 font-mono text-sm leading-6 text-[#e5e7eb]">
            {JSON.stringify(activeResult ?? result ?? EMPTY_RESULT, null, 2)}
          </pre>
        </div>

        <aside className="min-h-[620px] rounded-lg border border-[#dfe3dc] bg-white p-4 shadow-[0_16px_44px_rgba(24,29,38,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#243044]">Fields</h2>
            <span className="rounded-md border border-[#dfe3dc] px-2 py-1 font-mono text-xs text-[#596170]">
              {activeFields.length}
            </span>
          </div>
          {activeFields.length ? (
            <ul className="grid gap-2">
              {activeFields.map((field) => (
                <li
                  key={field}
                  className="rounded-md border border-[#e2e6df] bg-[#fbfcf8] px-3 py-2 font-mono text-xs text-[#243044]"
                >
                  {field}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-[#e2e6df] bg-[#fbfcf8] p-3 text-sm text-[#596170]">
              Run a scrape and select a result tab.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
