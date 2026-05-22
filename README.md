# Grocery Deals App

Proof-of-concept website for finding weekly grocery sale items near a user and using them to shape a weekly meal plan.

## Project Links

- GitHub repo: https://github.com/AustinHed/GroceryDealsApp
- Firebase project: https://console.firebase.google.com/project/grocerydeals-5a858/overview
- UI reference: `DESIGN.md`, installed from https://getdesign.md/airtable/design-md

## Local Development

```bash
npm run dev
```

Open http://localhost:3000 to view the site.

## Repository Structure

```txt
apps/
  web/          Next.js website hosted on Vercel
  ios/          Placeholder for the future iOS client
firebase/
  functions/    Firebase backend functions and integrations
packages/
  shared/       Shared types, constants, and future validation schemas
docs/           Architecture and API planning notes
```

## Current Scope

The current homepage is static. It includes the initial headline and address-entry surface only; grocery ad search, Firebase functions, OpenAI meal planning, and login gating are future work.
