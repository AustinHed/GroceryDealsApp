# API Plan

The backend API will be implemented with Firebase Functions and shared by the web app and future iOS app.

## Planned Functions

- `findNearbyStores`: Accepts an address and returns up to three supported nearby grocery stores.
- `getWeeklyDeals`: Accepts up to three store references, coordinates chain scrapers, and returns normalized sale items grouped by store.
- `generateMealPlan`: Accepts sale items and user preferences, then returns a structured weekly meal plan.

## Contract Rules

- Request and response types live in `packages/shared`.
- Backend integrations stay inside `firebase/functions`.
- Clients should display backend responses but not replicate scraper, store lookup, or OpenAI prompt logic.

## `getWeeklyDeals`

`getWeeklyDeals` is the multi-store weekly ad coordinator. It replaces the older `scrapeRuns` proof-of-concept for new client work.

### Request

```json
{
  "stores": [
    {
      "company": "kroger",
      "storeId": "01400413"
    }
  ]
}
```

- `stores` is required and must include 1-3 stores.
- `company` must be one of `aldi`, `jewel-osco`, `kroger`, `marianos`, `fred-meyer`, `qfc`, or `ralphs`.
- `storeId` is the chain-specific store identifier. Chain-specific validation belongs inside that chain scraper.
- Kroger-family banners (`kroger`, `marianos`, `fred-meyer`, `qfc`, `ralphs`) use the 8-digit Kroger `locationId` store identifier.
- Duplicate `company + storeId` entries are rejected.

### Response

```json
{
  "requestedAt": "2026-05-22T15:30:00.000Z",
  "dealCount": 12,
  "results": [
    {
      "company": "kroger",
      "storeId": "01400413",
      "status": "succeeded",
      "dealCount": 12,
      "deals": [
        {
          "id": "01400413-0",
          "storeId": "01400413",
          "name": "Apples",
          "price": "$1.99/lb",
          "category": "Produce"
        }
      ]
    },
    {
      "company": "aldi",
      "storeId": "123",
      "status": "failed",
      "error": "Weekly ad unavailable."
    }
  ]
}
```

- The coordinator runs each selected scraper independently.
- If a scraper fails, the coordinator retries that scraper once.
- If the second attempt fails, only that store result is marked `failed`; successful store results are still returned.
- Client UI should notify the user for failed store results and show successful results normally.

### Web Proxy

The Next.js web app exposes `/api/weekly-deals` as a server-side proxy for the browser. In deployed environments, set `WEEKLY_DEALS_COORDINATOR_ENDPOINT` to the Firebase `getWeeklyDeals` HTTP function URL. If the variable is absent, the route uses a local fallback for development and POC testing.

### Kroger-Family Scrapers

Kroger, Mariano's, Fred Meyer, QFC, and Ralphs share the Kroger Digital Ads scraper implementation. Each brand module supplies its own weekly ad URL and brand metadata while reusing the same circular lookup, deal normalization, and retry behavior.
