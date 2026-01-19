# Adding new dashboard endpoints

This guide is for humans and AI agents. It explains conventions for adding
endpoints that serve TRMNL-friendly JSON.

## TRMNL-friendly habits

- Design for pull: endpoints should return useful data on each request and
  avoid long-running work. TRMNL devices poll on a schedule. See:
  https://docs.usetrmnl.com/go/how-it-works
- Keep payloads small: private plugin payload sizes are constrained, so be
  mindful of response size and merge-variable structure. See:
  https://docs.usetrmnl.com/go/private-plugins/create-a-screen
- Prefer deterministic output: stable key ordering and field names reduce
  template churn and make dashboards easier to maintain.

## Endpoint template

Create a route file in `src/routes/` and register it in `src/server.ts`.

Example:

```ts
import { Hono } from 'hono';

const weatherRoute = new Hono();

weatherRoute.get('/weather', async (c) => {
  // Fetch external data, transform to a small JSON payload.
  return c.json({
    title: 'Weather',
    tempF: 71,
    updatedAt: new Date().toISOString(),
  });
});

export { weatherRoute };
```

Then add it to `src/server.ts`:

```ts
app.route('/api', weatherRoute);
```

## Error handling

Return JSON errors with useful `error` and `message` fields. Use `502` for
upstream failures and `500` for unexpected server errors.

## Response shape suggestions

There is no strict TRMNL schema for custom endpoints. Start with small JSON
objects that your template can render. Later, you can add optional metadata like
`refreshSeconds` or `cacheTtlSeconds` for more control.
