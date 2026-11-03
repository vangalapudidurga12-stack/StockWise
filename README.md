# StockWise - Merged Phase 1 + Feature Patch

This is the merged StockWise project. The feature patch has been integrated into the original Phase 1 project.

## Included
- Existing Phase 1 dashboard and inventory features
- Excel inventory import
- Product management (edit/delete)
- Daily sales history
- Stock movement history
- Sale history records
- Initial-import onboarding flow
- Login/registration rate limiting

## Important
- `server/.env` is intentionally not included if it was not present in the original ZIP. Create it from `server/.env.example`.
- Keep your existing MongoDB connection settings and use a JWT secret of at least 32 characters.
- The patch's nested `stockwise_patch` folder and duplicate README were not copied.

## Run
Backend:
```text
cd server
npm install
npm run dev
```

Frontend:
```text
cd client
npm install
npm run dev
```

Open the Vite URL shown in the frontend terminal (normally http://localhost:5173).
