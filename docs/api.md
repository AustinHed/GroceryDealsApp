# API Plan

The backend API will be implemented with Firebase Functions and shared by the web app and future iOS app.

## Planned Functions

- `findNearbyStores`: Accepts an address and returns up to three supported nearby grocery stores.
- `getWeeklyDeals`: Accepts store references and returns normalized sale items.
- `generateMealPlan`: Accepts sale items and user preferences, then returns a structured weekly meal plan.

## Contract Rules

- Request and response types live in `packages/shared`.
- Backend integrations stay inside `firebase/functions`.
- Clients should display backend responses but not replicate scraper, store lookup, or OpenAI prompt logic.
