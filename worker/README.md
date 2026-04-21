# Roast Dinner Worker

Cloudflare Worker that handles plan sharing via KV storage.

## Setup

### 1. Install dependencies

```bash
cd worker
npm install
```

### 2. Create the KV namespace

```bash
npx wrangler kv:namespace create PLANS
npx wrangler kv:namespace create PLANS --preview
```

This will output namespace IDs. Update `wrangler.toml` with the real values:

```toml
[[kv_namespaces]]
binding = "PLANS"
id = "<your-namespace-id>"
preview_id = "<your-preview-namespace-id>"
```

### 3. Local development

```bash
npm run dev
```

The Worker runs at `http://localhost:8787`. To point the frontend at it, create a `.env.local` file in the **project root**:

```
VITE_API_URL=http://localhost:8787
```

### 4. Deploy

```bash
npm run deploy
```

After deploying, note your Worker URL (e.g., `https://roast-dinner-worker.<subdomain>.workers.dev`). If it differs from the default in `src/config/api.ts`, set `VITE_API_URL` accordingly or update the default.

## API Endpoints

### `POST /api/plans`

Create a shared plan.

**Request body:**

```json
{
  "config": { /* MealConfig object */ }
}
```

**Response (201):**

```json
{
  "id": "abc12345",
  "url": "https://roastdinnerplanner.app/p/abc12345"
}
```

### `GET /api/plans/:id`

Retrieve a shared plan.

**Response (200):**

```json
{
  "id": "abc12345",
  "createdAt": "2026-04-21T18:00:00.000Z",
  "config": { /* MealConfig object */ }
}
```

**Response (404):**

```json
{
  "error": "Plan not found"
}
```

## Notes

- Plans expire after **30 days** (KV TTL)
- Plan IDs are 8-character alphanumeric strings derived from `crypto.randomUUID()`
- CORS is configured for the production domain and `localhost` for development
