"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, ListChecks, Minus, Plus, Search, Sparkles } from "lucide-react";
import {
  DEFAULT_RECIPES_PER_MEAL_TYPE,
  MAX_RECIPES_PER_MEAL_TYPE,
  MIN_RECIPES_PER_MEAL_TYPE,
  RECIPE_SERVINGS,
  type GenerateRecipesRequest,
  type GenerateRecipesResponse,
  type GeneratedRecipe,
  type SupportedStoreChain,
  type WeeklyDealsResponse,
} from "@grocery-deals/shared";

type FlowState = "idle" | "scraping" | "generating" | "succeeded" | "failed";

type StoreRow = {
  company: SupportedStoreChain;
  label: string;
  placeholder: string;
  storeId: string;
};

const STORE_ROWS: StoreRow[] = [
  { company: "kroger", label: "Kroger", placeholder: "01400413", storeId: "" },
  { company: "marianos", label: "Mariano's", placeholder: "53100531", storeId: "" },
  { company: "fred-meyer", label: "Fred Meyer", placeholder: "70100125", storeId: "" },
  { company: "qfc", label: "QFC", placeholder: "70500807", storeId: "" },
  { company: "ralphs", label: "Ralphs", placeholder: "70300703", storeId: "" },
];

export function MealPlanBuilder() {
  const [rows, setRows] = useState<StoreRow[]>(STORE_ROWS);
  const [recipeOptionsPerMealType, setRecipeOptionsPerMealType] = useState(DEFAULT_RECIPES_PER_MEAL_TYPE);
  const [allowPantryStaples, setAllowPantryStaples] = useState(true);
  const [state, setState] = useState<FlowState>("idle");
  const [weeklyDeals, setWeeklyDeals] = useState<WeeklyDealsResponse | null>(null);
  const [recipesResponse, setRecipesResponse] = useState<GenerateRecipesResponse | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Set<string>>(new Set());
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
  const canGenerate = state !== "scraping" && state !== "generating" && selectedCount > 0 && selectedCount <= 3;
  const lunchRecipes = recipesResponse?.recipes.filter((recipe) => recipe.mealType === "lunch") ?? [];
  const dinnerRecipes = recipesResponse?.recipes.filter((recipe) => recipe.mealType === "dinner") ?? [];

  function updateStoreId(company: SupportedStoreChain, storeId: string) {
    setRows((currentRows) => currentRows.map((row) => (row.company === company ? { ...row, storeId } : row)));
  }

  async function generateRecipes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("scraping");
    setError("");
    setWeeklyDeals(null);
    setRecipesResponse(null);
    setSelectedRecipeIds(new Set());
    setExpandedRecipeIds(new Set());

    try {
      const weeklyDealsResponse = await fetchJson<WeeklyDealsResponse>("/api/weekly-deals", {
        stores: requestStores,
      });
      setWeeklyDeals(weeklyDealsResponse);
      setState("generating");

      const recipeRequest: GenerateRecipesRequest = {
        stores: requestStores,
        weeklyDeals: weeklyDealsResponse,
        settings: {
          lunchCount: recipeOptionsPerMealType,
          dinnerCount: recipeOptionsPerMealType,
          servings: RECIPE_SERVINGS,
          allowPantryStaples,
        },
      };
      const generatedRecipes = await fetchJson<GenerateRecipesResponse>("/api/meal-plan", recipeRequest);

      setRecipesResponse(generatedRecipes);
      setState("succeeded");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Recipe generation failed.");
      setState("failed");
    }
  }

  function toggleSelected(recipeId: string) {
    setSelectedRecipeIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }

  function toggleExpanded(recipeId: string) {
    setExpandedRecipeIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }

  function updateRecipeOptions(nextCount: number) {
    setRecipeOptionsPerMealType(
      Math.min(MAX_RECIPES_PER_MEAL_TYPE, Math.max(MIN_RECIPES_PER_MEAL_TYPE, nextCount)),
    );
  }

  return (
    <main className="min-h-screen bg-white px-5 pb-16 pt-24 text-[#181d26] sm:px-8">
      <section className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="self-start rounded-lg border border-[#dddddd] bg-white p-5 shadow-[0_16px_44px_rgba(24,29,38,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#41454d]">Meal planning</p>
              <h1 className="mt-2 text-3xl font-medium leading-tight tracking-normal">Build recipes from weekly deals</h1>
            </div>
            <span className="rounded-md border border-[#dddddd] px-2.5 py-1 font-mono text-xs text-[#41454d]">
              {selectedCount}/3
            </span>
          </div>

          <form onSubmit={generateRecipes} className="mt-7 grid gap-5">
            <div className="grid gap-3">
              {rows.map((row) => (
                <label key={row.company} className="grid gap-2 text-sm font-medium text-[#333840]">
                  <span className="flex items-center justify-between gap-3">
                    {row.label}
                    <span className="font-mono text-xs text-[#41454d]">{row.company}</span>
                  </span>
                  <input
                    value={row.storeId}
                    onChange={(event) => updateStoreId(row.company, event.target.value)}
                    placeholder={row.placeholder}
                    className="h-11 rounded-md border border-[#dddddd] bg-white px-3 text-base text-[#181d26] outline-none transition focus:border-[#9297a0] focus:ring-2 focus:ring-[#d9dde5]"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-[#dddddd] bg-[#f8fafc] p-4">
              <div>
                <label htmlFor="recipe-count" className="block text-sm font-medium text-[#181d26]">
                  Recipes per meal type
                </label>
                <span className="mt-1 block text-sm text-[#41454d]">
                  {recipeOptionsPerMealType * 2} recipe options total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateRecipeOptions(recipeOptionsPerMealType - 1)}
                  disabled={recipeOptionsPerMealType === MIN_RECIPES_PER_MEAL_TYPE}
                  aria-label="Decrease recipe options"
                  className="grid size-9 place-items-center rounded-full border border-[#dddddd] bg-white text-[#181d26] transition hover:border-[#9297a0] disabled:cursor-not-allowed disabled:text-[#9297a0]"
                >
                  <Minus aria-hidden="true" className="size-4" />
                </button>
                <input
                  id="recipe-count"
                  type="number"
                  min={MIN_RECIPES_PER_MEAL_TYPE}
                  max={MAX_RECIPES_PER_MEAL_TYPE}
                  value={recipeOptionsPerMealType}
                  onChange={(event) => updateRecipeOptions(Number.parseInt(event.target.value, 10) || MIN_RECIPES_PER_MEAL_TYPE)}
                  className="h-10 w-12 rounded-md border border-[#dddddd] bg-white text-center text-base font-medium text-[#181d26] outline-none focus:border-[#9297a0]"
                />
                <button
                  type="button"
                  onClick={() => updateRecipeOptions(recipeOptionsPerMealType + 1)}
                  disabled={recipeOptionsPerMealType === MAX_RECIPES_PER_MEAL_TYPE}
                  aria-label="Increase recipe options"
                  className="grid size-9 place-items-center rounded-full border border-[#dddddd] bg-white text-[#181d26] transition hover:border-[#9297a0] disabled:cursor-not-allowed disabled:text-[#9297a0]"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-[#dddddd] bg-[#f8fafc] p-4">
              <span>
                <span className="block text-sm font-medium text-[#181d26]">Assume pantry staples</span>
                <span className="mt-1 block text-sm text-[#41454d]">Milk, flour, oil, sugar, common spices, and similar basics.</span>
              </span>
              <input
                type="checkbox"
                checked={allowPantryStaples}
                onChange={(event) => setAllowPantryStaples(event.target.checked)}
                className="size-5 accent-[#181d26]"
              />
            </label>

            <button
              type="submit"
              disabled={!canGenerate}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#181d26] px-5 py-3 text-base font-medium text-white transition hover:bg-[#0d1218] disabled:cursor-not-allowed disabled:bg-[#9297a0]"
            >
              {state === "scraping" ? <Search aria-hidden="true" className="size-5" /> : <Sparkles aria-hidden="true" className="size-5" />}
              {state === "scraping" ? "Scraping deals" : state === "generating" ? "Generating recipes" : "Generate recipes"}
            </button>
          </form>

          {selectedCount > 3 ? (
            <p className="mt-5 rounded-md border border-[#d9a441] bg-[#fffaf0] p-3 text-sm font-medium text-[#79560f]">
              Enter StoreIDs for up to 3 Kroger-family stores.
            </p>
          ) : null}

          {state === "failed" ? (
            <p className="mt-5 rounded-md border border-[#efb8b8] bg-[#fff5f5] p-3 text-sm font-medium text-[#8a1f1f]">
              {error}
            </p>
          ) : null}

          {weeklyDeals ? (
            <div className="mt-5 rounded-lg border border-[#dddddd] p-4">
              <p className="text-sm font-medium text-[#181d26]">{weeklyDeals.dealCount} deals found</p>
              <div className="mt-3 grid gap-2">
                {weeklyDeals.results.map((result) => (
                  <p key={`${result.company}-${result.storeId}`} className="flex items-center gap-2 text-sm text-[#41454d]">
                    {result.status === "succeeded" ? (
                      <Check aria-hidden="true" className="size-4 text-[#006400]" />
                    ) : (
                      <AlertTriangle aria-hidden="true" className="size-4 text-[#aa2d00]" />
                    )}
                    <span>
                      {formatCompany(result.company)} {result.storeId}:{" "}
                      {result.status === "succeeded" ? `${result.dealCount} deals` : result.error}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {recipesResponse ? (
            <button
              type="button"
              disabled={selectedRecipeIds.size === 0}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#dddddd] bg-white px-4 py-2 text-sm font-medium text-[#181d26] transition hover:border-[#9297a0] disabled:cursor-not-allowed disabled:text-[#9297a0]"
            >
              <ListChecks aria-hidden="true" className="size-4" />
              Generate grocery list ({selectedRecipeIds.size})
            </button>
          ) : null}
        </aside>

        <section className="grid gap-8">
          <RecipeSection
            title="Lunch Options"
            recipes={lunchRecipes}
            requestedCount={recipeOptionsPerMealType}
            dealIndex={recipesResponse?.dealIndex ?? {}}
            selectedRecipeIds={selectedRecipeIds}
            expandedRecipeIds={expandedRecipeIds}
            onToggleSelected={toggleSelected}
            onToggleExpanded={toggleExpanded}
          />
          <RecipeSection
            title="Dinner Options"
            recipes={dinnerRecipes}
            requestedCount={recipeOptionsPerMealType}
            dealIndex={recipesResponse?.dealIndex ?? {}}
            selectedRecipeIds={selectedRecipeIds}
            expandedRecipeIds={expandedRecipeIds}
            onToggleSelected={toggleSelected}
            onToggleExpanded={toggleExpanded}
          />
        </section>
      </section>
    </main>
  );
}

function RecipeSection({
  title,
  recipes,
  requestedCount,
  dealIndex,
  selectedRecipeIds,
  expandedRecipeIds,
  onToggleSelected,
  onToggleExpanded,
}: {
  title: string;
  recipes: GeneratedRecipe[];
  requestedCount: number;
  dealIndex: GenerateRecipesResponse["dealIndex"];
  selectedRecipeIds: Set<string>;
  expandedRecipeIds: Set<string>;
  onToggleSelected: (recipeId: string) => void;
  onToggleExpanded: (recipeId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 border-b border-[#dddddd] pb-3">
        <h2 className="text-2xl font-medium tracking-normal">{title}</h2>
        <span className="font-mono text-sm text-[#41454d]">{recipes.length}/{requestedCount}</span>
      </div>

      {recipes.length ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              dealIndex={dealIndex}
              isSelected={selectedRecipeIds.has(recipe.id)}
              isExpanded={expandedRecipeIds.has(recipe.id)}
              onToggleSelected={() => onToggleSelected(recipe.id)}
              onToggleExpanded={() => onToggleExpanded(recipe.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-[#dddddd] bg-[#f8fafc] p-6 text-sm text-[#41454d]">
          Recipes will appear here after the weekly deals are scraped and generated.
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  dealIndex,
  isSelected,
  isExpanded,
  onToggleSelected,
  onToggleExpanded,
}: {
  recipe: GeneratedRecipe;
  dealIndex: GenerateRecipesResponse["dealIndex"];
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
}) {
  return (
    <article className={`rounded-lg border bg-white p-4 transition ${isSelected ? "border-[#181d26]" : "border-[#dddddd]"}`}>
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={onToggleSelected}
          className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${
            isSelected ? "border-[#181d26] bg-[#181d26] text-white" : "border-[#dddddd] bg-white text-transparent"
          }`}
          aria-label={isSelected ? "Remove recipe" : "Select recipe"}
        >
          <Check aria-hidden="true" className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium leading-snug tracking-normal">{recipe.title}</h3>
          <p className="mt-2 text-sm leading-5 text-[#41454d]">{recipe.summary}</p>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="grid size-8 shrink-0 place-items-center rounded-full border border-[#dddddd] text-[#181d26] transition hover:border-[#9297a0]"
          aria-label={isExpanded ? "Collapse recipe" : "Expand recipe"}
        >
          {isExpanded ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {recipe.dealIdsUsed.map((dealId) => {
          const deal = dealIndex[dealId];

          return (
            <span key={dealId} className="rounded-full border border-[#dddddd] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium text-[#333840]">
              {deal ? `${formatCompany(deal.company)} ${deal.storeId}` : "Weekly deal"}
            </span>
          );
        })}
      </div>

      {isExpanded ? (
        <div className="mt-5 grid gap-5 border-t border-[#dddddd] pt-5">
          <div>
            <h4 className="text-sm font-medium text-[#181d26]">Ingredients</h4>
            <ul className="mt-3 grid gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`} className="flex flex-wrap items-center gap-2 text-sm text-[#333840]">
                  <span>{ingredient.quantity ? `${ingredient.quantity} ` : ""}{ingredient.name}</span>
                  {ingredient.isPantryStaple ? (
                    <span className="rounded-full bg-[#f5e9d4] px-2 py-0.5 text-xs font-medium text-[#181d26]">pantry</span>
                  ) : ingredient.company && ingredient.storeId ? (
                    <span className="rounded-full bg-[#a8d8c4] px-2 py-0.5 text-xs font-medium text-[#0a2e0e]">
                      {formatCompany(ingredient.company)} {ingredient.storeId}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[#181d26]">Instructions</h4>
            <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-5 text-[#333840]">
              {recipe.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </div>

          <p className="rounded-md border border-[#dddddd] bg-[#f8fafc] p-3 text-sm text-[#333840]">{recipe.expectedSavings}</p>
        </div>
      ) : null}
    </article>
  );
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload as T;
}

function formatCompany(company: string): string {
  return company
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
