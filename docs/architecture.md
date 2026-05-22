# Architecture

Grocery Deals is organized as a small monorepo so the website, future iOS app, Firebase backend, and shared API contracts can evolve together.

## Applications

- `apps/web`: Next.js app hosted on Vercel.
- `apps/ios`: Reserved for the future iOS client.

## Backend

- `firebase/functions`: Firebase Functions source for backend workflows.
- `firebase/functions/src/auth`: Authentication helpers and user context.
- `firebase/functions/src/stores`: Nearby supported-store lookup.
- `firebase/functions/src/scrapers`: Weekly ad scraper orchestration and chain-specific scrapers.
- `firebase/functions/src/meal-planning`: Meal plan generation flow.
- `firebase/functions/src/openai`: OpenAI API setup and prompt construction.

## Shared Contracts

- `packages/shared`: Shared types, constants, and future validation schemas used by clients and backend code.

The web and iOS apps should call Firebase Functions rather than duplicating business logic. The shared package should remain the source of truth for request and response shapes.
