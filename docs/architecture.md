# Architecture

Grocery Deals is organized as a small monorepo so the website, future iOS app, Firebase backend, and shared API contracts can evolve together.

## Applications

- `apps/web`: Next.js app hosted on Vercel.
- `apps/ios`: Reserved for the future iOS client.

## Backend

- `firebase/functions`: Firebase Functions source for backend workflows.
- `firebase/functions/src/auth`: Authentication helpers and user context.
- `firebase/functions/src/stores`: Nearby supported-store lookup.
- `firebase/functions/src/scrapers`: Weekly ad scraper coordination and chain-specific scraper modules.
- `firebase/functions/src/meal-planning`: Meal plan generation flow.
- `firebase/functions/src/openai`: OpenAI API setup and prompt construction.

## Shared Contracts

- `packages/shared`: Shared types, constants, and future validation schemas used by clients and backend code.

The web and iOS apps should call Firebase Functions rather than duplicating business logic. The shared package should remain the source of truth for request and response shapes.

## Weekly Deals Coordination

`getWeeklyDeals` is the backend coordinator for weekly ad scraping. Clients send up to three `{ company, storeId }` targets to the coordinator, and the coordinator dispatches each target to the matching chain scraper module.

Scrapers stay separated by chain under `firebase/functions/src/scrapers/chains`. Each scraper exposes the same internal contract: accept a normalized store object and return normalized `SaleItem[]`. Chain-specific details, including store ID format validation and source-specific parsing, stay inside the scraper module.

The coordinator owns cross-chain behavior:

- request validation and the three-store limit
- scraper selection by `company`
- concurrent execution
- one retry per failed scraper
- partial-success responses when one store fails but others succeed

The older `scrapeRuns` endpoint is a Kroger-only proof-of-concept. New client flows should use `getWeeklyDeals`.
