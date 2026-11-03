# DEV-10 Session Lifecycle

## Policy

Lucem uses a 30-minute sliding idle session. PostgreSQL `Session.expiresAt` and the `lucem_session` cookie use the same 30-minute idle window. A request renews only when fewer than five minutes remain, avoiding a database write and `Set-Cookie` on every request.

Cookie attributes remain `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and `Max-Age=1800`.

## Renewal Contract

`getAuth()` is read-only by default. Server Components and layouts call it without renewal and never mutate cookies. Route Handlers call `getAuth({ renewCookie: true })`; only that path may extend PostgreSQL and emit a refreshed cookie. The update is conditional on the session still being unexpired, so a revoked, inactive, invalid, or expired session cannot be renewed.

The active business is returned only when the session's selected business has a membership for the authenticated active user. Business selection checks the same membership set before updating the session. Logout deletes the server session and clears the cookie.

## Verification

`e2e/dev-10/session-audit.spec.ts` verifies a near-expiry session receives a refreshed cookie and PostgreSQL expiry, a deleted session receives no renewal and returns `401`, and logout blocks subsequent protected requests. The suite runs only against the dedicated `lucem_retail_e2e` PostgreSQL database.

## Residual Risk

A page request rendered entirely by Server Components does not renew the idle window by itself. Workspace browser activity uses Route Handler requests, which carry the renewal contract. This is intentional: mutating cookies from Server Components is not allowed by Next.js.
