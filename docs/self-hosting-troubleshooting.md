# Self-hosting troubleshooting

## Symptom: "authorize, then asked to sign in again" loop

On a self-hosted server, after a successful device authorization (the token
endpoint returns `200`), the plugin drops back to the sign-in screen. The
developer console shows:

```
SyntaxError: Unexpected token '<', "<html>"... is not valid JSON
  at JSON.parse
  at get json (app://obsidian.md/app.js ...)
  at Scrybble.fetchGetUser
  at Authentication.fetchAndSetUser
```

`fetchGetUser` throws, `fetchAndSetUser` dispatches `USER_FETCH_FAILED`, the
state returns to `UNAUTHENTICATED`, and the sign-in screen shows again. The same
crash can hit the device-auth poll path.

This is not a server outage. On a working self-hosted backend you can confirm:

- `GET /api/sync/user` with a valid Bearer token returns `200 application/json`.
- `GET /api/sync/user` unauthenticated with `Accept: application/json` returns `401 application/json`.
- `GET /api/sync/user` unauthenticated without `Accept: application/json` returns `302` to `/login`, then `200 text/html`.
- The plugin's POSTs (`/oauth/device/code`, `/oauth/token`, `/api/sync/RMFileTree`) reach the origin and return `200`.

The endpoint setting is correct (the plugin uses `settings.endpoint` for every
call). The problem is how the plugin handles a response that is not JSON.

## Causes

### 1. Authenticated responses were HTTP-cached and replayed

`authenticatedRequest` sends requests through Obsidian's `requestUrl`, which uses
Electron's network stack and honors HTTP caching. With no cache-control set, an
HTML `/login` page returned once for `GET /api/sync/user` could be cached and
then served on later calls without contacting the server. This kept the plugin
broken even after the server was fixed, until the Electron cache was cleared
(`~/Library/Application Support/obsidian/Cache`, a container's
`/config/.config/obsidian/Cache`). Observed directly: the failing GET never
appeared in the origin access log, and clearing the cache made the next call hit
the server and succeed.

### 2. `response.json` was read without checking the response

Obsidian's `requestUrl` exposes `.json` as a getter that runs `JSON.parse()`. If
the body is HTML (an auth redirect, a proxy or error page), every call site threw
a `SyntaxError` that looked like a generic failure and was hard to diagnose.

## How the plugin handles it now

- `authenticatedRequest` sends `Cache-Control: no-cache` and `Pragma: no-cache`,
  so Electron always revalidates and never replays a stale body.
- `expectJson()` checks the HTTP status and `Content-Type` before reading
  `.json`, and throws a clear error otherwise ("the Scrybble server returned
  status ... with content-type ... instead of JSON. If you are self-hosting,
  check that your server URL is correct and the server is reachable."). It is
  used by the data endpoints (sync delta, file tree, onboarding, user) and the
  OAuth calls (device code, token poll, token refresh). The poll and refresh
  calls allow a non-2xx status so the device flow's expected
  `400 authorization_pending` JSON still reaches the caller.

## Recommended server-side complement (scrybble-site)

Have `/api/*` always return JSON (`401`) for unauthenticated requests instead of
redirecting to the HTML `/login` page, regardless of the `Accept` header, and
send `Cache-Control: no-store` on `/api/*`. This removes the HTML the plugin can
fail on. Operators can do the same at the reverse proxy today (force
`Accept: application/json` and `Cache-Control: no-store` on `/api`), but handling
it in the app is more robust.
