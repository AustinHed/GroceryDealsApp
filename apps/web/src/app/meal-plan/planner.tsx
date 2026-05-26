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
  type MealPlanDeal,
  type SupportedStoreChain,
  type WeeklyDealsResponse,
} from "@grocery-deals/shared";

type FlowState = "idle" | "scraping" | "deals-ready" | "generating" | "succeeded" | "failed";
type DealSort = "amount" | "percent";

type DisplayDeal = {
  key: string;
  company: SupportedStoreChain;
  productName: string;
  priceText?: string;
  savingsAmount?: number;
  savingsPercent?: number;
  discountType: string;
  promotionText?: string;
  category?: string;
  requiresLoyalty?: boolean;
  requiresDigitalCoupon?: boolean;
};

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

const FOOD_CATEGORIES = new Set([
  "PRODUCE",
  "MEAT",
  "PKG MEAT",
  "SEAFOOD",
  "DELI/BAKE",
  "GROCERY",
  "NATURAL FOODS",
  "LIQUOR",
]);

const STORE_PILL_STYLES: Record<SupportedStoreChain, string> = {
  aldi: "border-[#bddbcc] bg-[#eaf6ef] text-[#14553c]",
  "jewel-osco": "border-[#f5c6bb] bg-[#fff0ec] text-[#8b2e19]",
  kroger: "border-[#c6daf6] bg-[#ebf3ff] text-[#164d95]",
  marianos: "border-[#ddcdf1] bg-[#f4edfc] text-[#5c3388]",
  "fred-meyer": "border-[#c7e1d0] bg-[#eaf7ee] text-[#17613a]",
  qfc: "border-[#bce3e5] bg-[#e7f8f8] text-[#0f5b60]",
  ralphs: "border-[#f3d29d] bg-[#fff4df] text-[#7b4d00]",
};

export function MealPlanBuilder() {
  const [rows, setRows] = useState<StoreRow[]>(STORE_ROWS);
  const [recipeOptionsPerMealType, setRecipeOptionsPerMealType] = useState(DEFAULT_RECIPES_PER_MEAL_TYPE);
  const [allowPantryStaples, setAllowPantryStaples] = useState(true);
  const [state, setState] = useState<FlowState>("idle");
  const [weeklyDeals, setWeeklyDeals] = useState<WeeklyDealsResponse | null>(null);
  const [recipesResponse, setRecipesResponse] = useState<GenerateRecipesResponse | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Set<string>>(new Set());
  const [dealSort, setDealSort] = useState<DealSort>("amount");
  const [dealTypeFilter, setDealTypeFilter] = useState<string>("all");
  const [foodOnly, setFoodOnly] = useState(true);
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
  const fetchedDeals = useMemo(() => buildDisplayDeals(weeklyDeals), [weeklyDeals]);
  const recipeWeeklyDeals = useMemo(
    () => (foodOnly && weeklyDeals ? filterWeeklyDealsForFood(weeklyDeals) : weeklyDeals),
    [foodOnly, weeklyDeals],
  );
  const isBusy = state === "scraping" || state === "generating";
  const canFetch = !isBusy && selectedCount > 0 && selectedCount <= 3;
  const canGenerate = !isBusy && Boolean(recipeWeeklyDeals) && Boolean(recipeWeeklyDeals?.dealCount);
  const lunchRecipes = recipesResponse?.recipes.filter((recipe) => recipe.mealType === "lunch") ?? [];
  const dinnerRecipes = recipesResponse?.recipes.filter((recipe) => recipe.mealType === "dinner") ?? [];

  function updateStoreId(company: SupportedStoreChain, storeId: string) {
    setRows((currentRows) => currentRows.map((row) => (row.company === company ? { ...row, storeId } : row)));
    setState("idle");
    setWeeklyDeals(null);
    setRecipesResponse(null);
    setSelectedRecipeIds(new Set());
    setExpandedRecipeIds(new Set());
    setDealTypeFilter("all");
    setError("");
  }

  async function fetchDeals(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("scraping");
    setError("");
    setWeeklyDeals(null);
    setRecipesResponse(null);
    setSelectedRecipeIds(new Set());
    setExpandedRecipeIds(new Set());
    setDealSort("amount");
    setDealTypeFilter("all");

    try {
      const weeklyDealsResponse = await fetchJson<WeeklyDealsResponse>("/api/weekly-deals", {
        stores: requestStores,
      });
      setWeeklyDeals(weeklyDealsResponse);
      setState("deals-ready");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Fetching deals failed.");
      setState("failed");
    }
  }

  async function generateRecipes() {
    if (!recipeWeeklyDeals || recipeWeeklyDeals.dealCount === 0) return;

    setState("generating");
    setError("");
    setRecipesResponse(null);
    setSelectedRecipeIds(new Set());
    setExpandedRecipeIds(new Set());

    try {
      const recipeRequest: GenerateRecipesRequest = {
        stores: requestStores,
        weeklyDeals: recipeWeeklyDeals,
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

  function clearGeneratedRecipes() {
    setRecipesResponse(null);
    setSelectedRecipeIds(new Set());
    setExpandedRecipeIds(new Set());
    setState(weeklyDeals ? "deals-ready" : "idle");
    setError("");
  }

  function updateRecipeOptions(nextCount: number) {
    setRecipeOptionsPerMealType(
      Math.min(MAX_RECIPES_PER_MEAL_TYPE, Math.max(MIN_RECIPES_PER_MEAL_TYPE, nextCount)),
    );
    clearGeneratedRecipes();
  }

  function updateAllowPantryStaples(nextValue: boolean) {
    setAllowPantryStaples(nextValue);
    clearGeneratedRecipes();
  }

  function updateFoodOnly(nextValue: boolean) {
    setFoodOnly(nextValue);
    setDealTypeFilter("all");
    clearGeneratedRecipes();
  }

  return (
    <main className="min-h-screen bg-white px-5 pb-16 pt-24 text-[#181d26] sm:px-8">
      <section className="mx-auto grid w-full max-w-[1600px] gap-8 lg:grid-cols-[340px_300px_minmax(0,1fr)] xl:grid-cols-[360px_340px_minmax(0,1fr)]">
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

          <form onSubmit={fetchDeals} className="mt-7 grid gap-5">
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
                    disabled={isBusy}
                    className="h-11 rounded-md border border-[#dddddd] bg-white px-3 text-base text-[#181d26] outline-none transition focus:border-[#9297a0] focus:ring-2 focus:ring-[#d9dde5] disabled:cursor-not-allowed disabled:bg-[#f8fafc]"
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
                  disabled={isBusy || recipeOptionsPerMealType === MIN_RECIPES_PER_MEAL_TYPE}
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
                  disabled={isBusy}
                  className="h-10 w-12 rounded-md border border-[#dddddd] bg-white text-center text-base font-medium text-[#181d26] outline-none focus:border-[#9297a0] disabled:bg-[#f8fafc]"
                />
                <button
                  type="button"
                  onClick={() => updateRecipeOptions(recipeOptionsPerMealType + 1)}
                  disabled={isBusy || recipeOptionsPerMealType === MAX_RECIPES_PER_MEAL_TYPE}
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
                onChange={(event) => updateAllowPantryStaples(event.target.checked)}
                disabled={isBusy}
                className="size-5 accent-[#181d26]"
              />
            </label>

            <button
              type="submit"
              disabled={!canFetch}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#181d26] px-5 py-3 text-base font-medium text-white transition hover:bg-[#0d1218] disabled:cursor-not-allowed disabled:bg-[#9297a0]"
            >
              <Search aria-hidden="true" className="size-5" />
              {state === "scraping" ? "Fetching deals" : "Fetch Deals"}
            </button>

            <button
              type="button"
              onClick={generateRecipes}
              disabled={!canGenerate}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#181d26] bg-white px-5 py-3 text-base font-medium text-[#181d26] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:border-[#dddddd] disabled:text-[#9297a0]"
            >
              <Sparkles aria-hidden="true" className="size-5" />
              {state === "generating" ? "Generating recipes" : "Generate Recipes"}
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

        <DealsColumn
          weeklyDeals={weeklyDeals}
          deals={fetchedDeals}
          sort={dealSort}
          filter={dealTypeFilter}
          foodOnly={foodOnly}
          isBusy={isBusy}
          onSortChange={setDealSort}
          onFilterChange={setDealTypeFilter}
          onFoodOnlyChange={updateFoodOnly}
        />

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

function DealsColumn({
  weeklyDeals,
  deals,
  sort,
  filter,
  foodOnly,
  isBusy,
  onSortChange,
  onFilterChange,
  onFoodOnlyChange,
}: {
  weeklyDeals: WeeklyDealsResponse | null;
  deals: DisplayDeal[];
  sort: DealSort;
  filter: string;
  foodOnly: boolean;
  isBusy: boolean;
  onSortChange: (sort: DealSort) => void;
  onFilterChange: (filter: string) => void;
  onFoodOnlyChange: (foodOnly: boolean) => void;
}) {
  const categoryDeals = useMemo(
    () => deals.filter((deal) => !foodOnly || isFoodCategory(deal.category)),
    [deals, foodOnly],
  );
  const dealTypes = useMemo(
    () => Array.from(new Set(categoryDeals.map((deal) => deal.discountType))).sort((left, right) => left.localeCompare(right)),
    [categoryDeals],
  );
  const visibleDeals = useMemo(
    () =>
      categoryDeals
        .filter((deal) => filter === "all" || deal.discountType === filter)
        .toSorted((left, right) => {
          const value =
            sort === "amount"
              ? (right.savingsAmount ?? 0) - (left.savingsAmount ?? 0)
              : (right.savingsPercent ?? 0) - (left.savingsPercent ?? 0);

          return value || left.productName.localeCompare(right.productName);
        }),
    [categoryDeals, filter, sort],
  );

  return (
    <aside className="self-start rounded-lg border border-[#dddddd] bg-white p-4 shadow-[0_16px_44px_rgba(24,29,38,0.06)]">
      <div className="flex items-end justify-between gap-3 border-b border-[#dddddd] pb-3">
        <div>
          <p className="text-sm font-medium text-[#41454d]">Weekly ads</p>
          <h2 className="mt-1 text-2xl font-medium tracking-normal">Deals</h2>
        </div>
        <span className="font-mono text-sm text-[#41454d]">{weeklyDeals?.dealCount ?? 0}</span>
      </div>

      {weeklyDeals ? (
        <>
          <div className="mt-4 grid gap-3">
            <label className="flex items-start justify-between gap-3 rounded-md border border-[#dddddd] bg-[#f8fafc] p-3 text-sm text-[#181d26]">
              <span>
                <span className="block font-medium">Food and beverages only</span>
                <span className="mt-1 block text-xs text-[#41454d]">Hide other deals and exclude them from recipes.</span>
              </span>
              <input
                type="checkbox"
                checked={foodOnly}
                disabled={isBusy}
                onChange={(event) => onFoodOnlyChange(event.target.checked)}
                className="mt-0.5 size-4 accent-[#181d26]"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-[#41454d]">
              Sort by
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as DealSort)}
                className="h-10 rounded-md border border-[#dddddd] bg-white px-3 text-sm text-[#181d26] outline-none focus:border-[#9297a0]"
              >
                <option value="amount">Dollar off: high to low</option>
                <option value="percent">Percent off: high to low</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-[#41454d]">
              Deal type
              <select
                value={filter}
                onChange={(event) => onFilterChange(event.target.value)}
                className="h-10 rounded-md border border-[#dddddd] bg-white px-3 text-sm text-[#181d26] outline-none focus:border-[#9297a0]"
              >
                <option value="all">All deal types</option>
                {dealTypes.map((dealType) => (
                  <option key={dealType} value={dealType}>
                    {formatDealType(dealType)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-2">
            <p className="text-xs text-[#41454d]">
              Showing {visibleDeals.length} of {deals.length} fetched deals.
            </p>
            {weeklyDeals.results.map((result) => (
              <p key={`${result.company}-${result.storeId}`} className="flex items-start gap-2 text-xs text-[#41454d]">
                {result.status === "succeeded" ? (
                  <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[#006400]" />
                ) : (
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[#aa2d00]" />
                )}
                <span>
                  {formatCompany(result.company)}:{" "}
                  {result.status === "succeeded" ? `${result.dealCount} deals` : result.error}
                </span>
              </p>
            ))}
          </div>

          <div className="mt-4 max-h-[calc(100vh-25rem)] min-h-48 overflow-y-auto pr-1">
            {visibleDeals.length ? (
              <div className="grid gap-3">
                {visibleDeals.map((deal) => (
                  <article key={deal.key} className="rounded-md border border-[#dddddd] bg-[#f8fafc] p-3">
                    <StorePill company={deal.company} />
                    <p className="mt-2 text-sm font-medium leading-snug text-[#181d26]">{deal.productName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {formatPrice(deal) ? <span className="font-medium text-[#181d26]">{formatPrice(deal)}</span> : null}
                      <span className="rounded-full bg-white px-2 py-0.5 font-medium text-[#333840]">
                        {formatDiscount(deal)}
                      </span>
                    </div>
                    {shouldShowOfferDetails(deal) ? (
                      <p className="mt-2 text-xs leading-5 text-[#41454d]">{formatOfferDetails(deal)}</p>
                    ) : null}
                    <RequirementBadges deal={deal} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[#dddddd] p-4 text-sm text-[#41454d]">
                {deals.length === 0
                  ? "No deals were found in the selected weekly ads."
                  : categoryDeals.length
                    ? "No deals match this filter."
                    : "No deals match the selected food filter."}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-[#dddddd] bg-[#f8fafc] p-4 text-sm text-[#41454d]">
          Fetch deals to review weekly ad savings before generating recipes.
        </p>
      )}
    </aside>
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
  const relatedCompanies = Array.from(
    new Set(
      recipe.dealIdsUsed
        .map((dealId) => dealIndex[dealId]?.company)
        .filter((company): company is SupportedStoreChain => Boolean(company)),
    ),
  );

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
        {relatedCompanies.length ? (
          relatedCompanies.map((company) => (
            <StorePill key={company} company={company} />
          ))
        ) : (
          <span className="rounded-full border border-[#dddddd] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium text-[#333840]">
            Weekly deal
          </span>
        )}
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
                    <StorePill company={ingredient.company} />
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

      <div className="mt-5 border-t border-[#dddddd] pt-4">
        <h4 className="text-sm font-medium text-[#181d26]">Related deals</h4>
        <div className="mt-3 grid gap-2">
          {recipe.dealIdsUsed.map((dealId) => {
            const deal = dealIndex[dealId];

            return deal ? (
              <article key={dealId} className="rounded-md bg-[#f8fafc] p-3 text-sm text-[#333840]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <StorePill company={deal.company} />
                    <p className="mt-2 font-medium text-[#181d26]">{deal.productName}</p>
                  </div>
                  <div className="text-right text-xs">
                    {formatPrice(deal) ? <p className="font-medium text-[#181d26]">{formatPrice(deal)}</p> : null}
                    <p className="mt-1 text-[#41454d]">{formatDiscount(deal)}</p>
                  </div>
                </div>
                {shouldShowOfferDetails(deal) ? (
                  <p className="mt-2 text-xs leading-5 text-[#41454d]">{formatOfferDetails(deal)}</p>
                ) : null}
                <RequirementBadges deal={deal} />
              </article>
            ) : (
              <p key={dealId} className="rounded-md bg-[#f8fafc] p-3 text-sm text-[#41454d]">
                Weekly deal details unavailable.
              </p>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function buildDisplayDeals(weeklyDeals: WeeklyDealsResponse | null): DisplayDeal[] {
  if (!weeklyDeals) return [];

  return weeklyDeals.results.flatMap((result) => {
    if (result.status !== "succeeded") return [];

    return result.deals.map((deal, index) => {
      const isDetailedDeal = "productName" in deal;

      return {
        key: `${result.company}:${result.storeId}:${index}`,
        company: result.company,
        productName: isDetailedDeal ? deal.productName : deal.name,
        priceText: isDetailedDeal ? deal.salePriceText : deal.price,
        savingsAmount: isDetailedDeal ? deal.savingsAmount : undefined,
        savingsPercent: isDetailedDeal ? deal.savingsPercent : undefined,
        discountType: isDetailedDeal ? deal.discountType : "unknown",
        promotionText: isDetailedDeal ? deal.promotionText : undefined,
        category: deal.category,
        requiresLoyalty: isDetailedDeal ? deal.requiresLoyalty : undefined,
        requiresDigitalCoupon: isDetailedDeal ? deal.requiresDigitalCoupon : undefined,
      };
    });
  });
}

function filterWeeklyDealsForFood(weeklyDeals: WeeklyDealsResponse): WeeklyDealsResponse {
  const results = weeklyDeals.results.map((result) => {
    if (result.status !== "succeeded") return result;

    const deals = result.deals.filter((deal) => isFoodCategory(deal.category));
    return { ...result, deals, dealCount: deals.length };
  });

  return {
    ...weeklyDeals,
    results,
    dealCount: results.reduce((total, result) => (result.status === "succeeded" ? total + result.dealCount : total), 0),
  };
}

function isFoodCategory(category?: string): boolean {
  return Boolean(category && FOOD_CATEGORIES.has(category.toUpperCase()));
}

function RequirementBadges({
  deal,
}: {
  deal: Pick<DisplayDeal, "requiresDigitalCoupon" | "requiresLoyalty"> | Pick<MealPlanDeal, "requiresDigitalCoupon" | "requiresLoyalty">;
}) {
  if (!deal.requiresDigitalCoupon && !deal.requiresLoyalty) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
      {deal.requiresDigitalCoupon ? (
        <span className="rounded-full bg-[#e4ecf8] px-2 py-0.5 font-medium text-[#1f3b65]">Digital coupon</span>
      ) : null}
      {deal.requiresLoyalty ? (
        <span className="rounded-full bg-[#f5e9d4] px-2 py-0.5 font-medium text-[#604811]">Loyalty required</span>
      ) : null}
    </div>
  );
}

function StorePill({ company }: { company: SupportedStoreChain }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STORE_PILL_STYLES[company]}`}>
      {formatCompany(company)}
    </span>
  );
}

function formatDiscount(deal: {
  savingsAmount?: number;
  savingsPercent?: number;
  discountType: string;
}): string {
  if (deal.savingsAmount !== undefined) return `${formatMoney(deal.savingsAmount)} off`;
  if (deal.savingsPercent !== undefined) return `${deal.savingsPercent}% off`;
  return formatDealType(deal.discountType);
}

function shouldShowOfferDetails(deal: { discountType: string }): boolean {
  return !["amount_off", "percent_off"].includes(deal.discountType);
}

function formatOfferDetails(deal: {
  promotionText?: string;
  discountType: string;
  regularPriceText?: string;
}): string {
  if (deal.promotionText) return deal.promotionText;
  if (deal.discountType === "sale_price" && deal.regularPriceText) return `Regular ${deal.regularPriceText}`;
  return "Offer details unavailable";
}

function formatPrice(deal: { priceText?: string; savingsAmount?: number; savingsPercent?: number; discountType: string }): string | undefined {
  if (!deal.priceText) return undefined;

  const priceText = deal.priceText.trim();
  if (
    priceText.toLowerCase() === formatDiscount(deal).toLowerCase() ||
    /\bsave\s+\$|\b\d+(?:\.\d+)?%\s*off\b|\bbogo\b/i.test(priceText)
  ) {
    return undefined;
  }

  return priceText;
}

function formatDealType(dealType: string): string {
  const labels: Record<string, string> = {
    amount_off: "Amount off",
    bogo: "BOGO",
    digital_coupon: "Digital coupon",
    loyalty: "Loyalty price",
    multi_buy: "Multi-buy",
    percent_off: "Percent off",
    sale_price: "Sale price",
    unknown: "Weekly deal",
  };

  return (
    labels[dealType] ??
    dealType
      .split("_")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ")
  );
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2).replace(/\.00$/, "")}`;
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
