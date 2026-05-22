"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import type { SupportedStoreChain, WeeklyDealsResponse } from "@grocery-deals/shared";

type RequestState = "idle" | "running" | "succeeded" | "failed";

type StoreRow = {
  id: string;
  company: SupportedStoreChain;
  storeId: string;
};

const COMPANY_OPTIONS: Array<{ value: SupportedStoreChain; label: string }> = [
  { value: "kroger", label: "Kroger" },
  { value: "aldi", label: "Aldi" },
  { value: "jewel-osco", label: "Jewel-Osco" },
];

const EMPTY_RESULT = {
  requestedAt: "",
  results: [],
  dealCount: 0,
};

export function WeeklyDealsTester() {
  const [rows, setRows] = useState<StoreRow[]>([{ id: "store-1", company: "kroger", storeId: "" }]);
  const [state, setState] = useState<RequestState>("idle");
  const [result, setResult] = useState<WeeklyDealsResponse | null>(null);
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
  const canSubmit = state !== "running" && requestStores.length > 0;

  function updateRow(id: string, patch: Partial<Omit<StoreRow, "id">>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((currentRows) => {
      if (currentRows.length >= 3) return currentRows;
      const nextId =
        Math.max(
          0,
          ...currentRows.map((row) => Number.parseInt(row.id.replace("store-", ""), 10)).filter(Number.isFinite),
        ) + 1;

      return [...currentRows, { id: `store-${nextId}`, company: "kroger", storeId: "" }];
    });
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
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
      setState("succeeded");
    } catch (coordinatorError) {
      setError(coordinatorError instanceof Error ? coordinatorError.message : "Weekly deals coordinator failed.");
      setState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 pb-12 pt-24 text-[#181d26] sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[430px_1fr]">
        <div className="rounded-lg border border-[#dfe3dc] bg-white p-5 shadow-[0_16px_44px_rgba(24,29,38,0.07)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Weekly deals coordinator</h1>
            </div>
            <span className="rounded-md border border-[#dfe3dc] px-2.5 py-1 font-mono text-xs text-[#596170]">
              {requestStores.length}/3
            </span>
          </div>

          <form onSubmit={runCoordinator} className="mt-6 grid gap-4">
            <div className="grid gap-3">
              {rows.map((row, index) => (
                <div key={row.id} className="grid gap-3 rounded-lg border border-[#e2e6df] bg-[#fbfcf8] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#3d4450]">Store {index + 1}</span>
                    <button
                      type="button"
                      aria-label={`Remove store ${index + 1}`}
                      disabled={rows.length === 1}
                      onClick={() => removeRow(row.id)}
                      className="grid size-8 place-items-center rounded-md border border-[#d9dde5] bg-white text-[#596170] transition hover:border-[#a6adb9] hover:text-[#181d26] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                    <label className="grid gap-1.5 text-sm font-semibold text-[#3d4450]">
                      Company
                      <select
                        value={row.company}
                        onChange={(event) =>
                          updateRow(row.id, { company: event.target.value as SupportedStoreChain })
                        }
                        className="h-11 rounded-md border border-[#cfd5cf] bg-white px-3 text-base outline-none transition focus:border-[#4f7d5a] focus:ring-2 focus:ring-[#b8d6bd]"
                      >
                        {COMPANY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5 text-sm font-semibold text-[#3d4450]">
                      Store ID
                      <input
                        value={row.storeId}
                        onChange={(event) => updateRow(row.id, { storeId: event.target.value })}
                        placeholder={row.company === "kroger" ? "01400413" : "Store ID"}
                        className="h-11 rounded-md border border-[#cfd5cf] bg-white px-3 text-base outline-none transition focus:border-[#4f7d5a] focus:ring-2 focus:ring-[#b8d6bd]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= 3 || state === "running"}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#cfd5cf] bg-white px-4 py-2 text-sm font-semibold text-[#243044] transition hover:border-[#a6adb9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add store
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#1f4d2a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173b20] disabled:cursor-not-allowed disabled:bg-[#9aa79c]"
              >
                <Search aria-hidden="true" className="size-4" />
                {state === "running" ? "Running" : "Run coordinator"}
              </button>
            </div>
          </form>

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
            <span>Coordinator JSON</span>
            <span>{state}</span>
          </div>
          <pre className="max-h-[calc(100vh-180px)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#0b1020] p-4 font-mono text-sm leading-6 text-[#e5e7eb]">
            {JSON.stringify(result ?? EMPTY_RESULT, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
