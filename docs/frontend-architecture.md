# Mealibrio Frontend Architecture Conventions

## 1. Layers and dependency direction

```text
src/
  domain/    pure business rules and types — no I/O, no config, no React
  infra/     platform adapters: http, auth, storage, config, graphql
  features/  business capabilities: api, store, ui, pages
  app/       composition: router, layouts, bootstrap, route guards
  common/    cross-cutting constants such as route paths
  store/     Redux composition plus its narrow public hooks/type bridge
```

Allowed direction:

```text
app -> features -> infra -> domain
app -> features -> domain
app -> common,  features -> common,  infra -> common
app -> store -> features
```

Redux has one deliberate, narrow integration edge back from feature code: features may import the
typed hooks and compile-time `RootState`/`AppDispatch` types from the public `@/store` entry point.
They must never import `@/store/store`, access the runtime store instance, or reach into another
store module. `store/store.ts` is composition code: it registers reducers through feature public
entry points and is imported only by application bootstrap and application-level loaders. Keeping
the hooks in a separate module prevents the feature-to-store edge from creating a runtime cycle.

**`domain` is the bottom.** It must not import from `infra`, `features`, or `app`, and must not
read configuration, storage, or the network. A domain function that needs an environment value
takes it as an argument, or — better — the module exports a factory that is constructed once with
that value at the composition edge. Threading the same config argument through five signatures is
a sign the boundary is in the wrong place.

**`infra` may not import from `features` or `app`.** It is the only layer that knows about
`window`, `fetch`, authentication SDKs, or `import.meta.env`.

**Features own their backend contract.** Endpoint paths, request shapes, response DTOs, and
DTO-to-model mapping live in `features/<name>/api`. `infra/platform/http` owns transport only:
base URL, auth attachment, JSON parsing, normalised errors, and 401 reporting.

Feature-to-feature imports go through the producer's public entry point, never into another
feature's `api`, `store`, or internals.

Inside `src/features/<name>`, imports of that same feature's modules are relative. Imports outside
the feature — another feature's public entry point, domain, infrastructure, common, store, or
assets — use the `@/` alias. This keeps relative specifiers visibly internal and aliased feature
specifiers visibly cross-feature.

Top-level buckets such as `utils` and `types` are not architectural layers. Put cross-cutting
constants in `common` and pure business concepts in `domain`.

---

## 2. Naming

1. Folders are kebab-case: `product-catalog`, `users-and-permissions`.
2. React components are PascalCase: `ProductList.tsx`, `CheckoutPage.tsx`.
3. Everything else is camelCase: `productSlice.ts`, `useCart.ts`, `cartRules.ts`.

`npm run lint:names` enforces this and runs as part of the `lint` composite.

---

## 3. Types

TypeScript is only worth its cost if a type is a promise the code keeps. These rules are about
keeping that promise.

**No `?: T | null`.** An optional-and-nullable field has three states — absent, `null`, and a
value — where the code almost always distinguishes two. Pick one and mean it:

```ts
// wrong: caller must handle undefined AND null, and cannot tell which the backend sends
badgeImageUrl?: string | null;

// right: the backend omits it
badgeImageUrl?: string;

// right: the backend sends an explicit null
badgeImageUrl: string | null;
```

**No `as unknown as T`.** A double assertion turns off the type system entirely and hides the
place where the real shape is unknown. Parse and narrow instead — a type guard that returns
`value is T` is checkable; an assertion is a wish.

**No `any`, no `@ts-ignore`, no non-null `!` assertions** in application code. If a value can be
absent, handle the absence.

**Derive unions from const objects, never write both.**

```ts
export const RESOURCE_STATUS = { READY: 'READY', FAILED: 'FAILED' } as const;
export type ResourceStatus =
  (typeof RESOURCE_STATUS)[keyof typeof RESOURCE_STATUS];
```

A hand-written union beside a hand-written array drifts silently — adding a member to one does not
fail the other. Where a list must mirror a type, bind it with `satisfies` so the compiler checks it.

**No magic literals.** Route paths come from `common/routes`, statuses and modes from `domain`
enums, and endpoint paths from the owning feature's `api`. A bare `'/user/login'` or
`'/account/settings'` inline in a module is a defect, not a shortcut — the compiler cannot tell
you when the real value moves.

---

## 4. Configuration

All environment reading happens in `infra/platform/config`, is validated once at startup, and is
exposed as a typed object. Nothing else calls `import.meta.env`.

Validate what the application genuinely cannot function without — a missing required value should
fail fast and loudly. Do **not** add runtime guards for conditions your infrastructure makes
impossible; that is cost without protection, and it teaches readers that the guard means something.

A value used as a **security boundary** — an origin the app will navigate to, an origin it will
accept a credential from — must be pinned to configuration and compared, not merely shape-checked.
A check that validates a URL's scheme and path but not its host is not a control. Compare the configured origin explicitly.

---

## 5. Async state and errors

Use a consistent loading/error state for pages that load a single editable resource. Keep not-found
detection in small pure helpers with tests covering the real backend message shapes.

A 401 invalidates the current session **only** when that session's credential was attached to the
request. An unauthenticated call that fails must never tear down authenticated state — that turns a
rejected credential into a denial of service against a valid session.

Fail closed on credential resolution. When a session exists but is unusable, the transport must
abort rather than silently fall back to another credential. Distinguish "no session" from "session
present but unusable"; collapsing them is how privilege downgrade bugs happen.

---

## 6. Testing

Every unit of behaviour needs a focused test at the lowest useful level. Mock at the boundary of the
unit under test: for a page, mock that feature's API module; for an API module, mock the transport
and assert the path and query contract.

Assertions must be able to fail. An assertion that restates what the line above already proved, or
that can only pass, is noise that makes the suite look stronger than it is.

Test the failure paths deliberately — rejected credentials, malformed stored state, superseded
requests. Those are where this feature's bugs have actually lived.

Frontend unit tests mock their owned boundaries; they do not validate producer contracts.
Use UI-to-real-API verification for transport and database contract coverage.

---

## 7. Reviewing changes

Review both source and running behavior:

**Review the file, not just the hunk.** A diff shows what moved, not whether the result is correct.
Inline literals, stale fallbacks, and mismatched constants live in the unchanged lines around a
change.

**Verify the artifact, not the source.** Source review tells you what will ship, not what is
running. When diagnosing a defect observed in a deployed environment, confirm which build produced
the evidence before reasoning about the code:

```sh
curl -s https://<host>/<entry-route> | grep -oE 'src="[^"]*\.js"'
curl -s https://<host>/<bundle>.js | grep -c '<marker from the change>'
```

---

## 8. Gates

```sh
npm run lint          # eslint + stylelint + naming + architecture boundaries
npm run test
npm run build
```

All three must pass before merge.

`npm run lint:boundaries` scans source imports, including relative paths, and enforces the layer
directions in §1. Cross-feature consumers must import from `@/features/<feature>`; only code inside
the producer feature may import its internal modules.
