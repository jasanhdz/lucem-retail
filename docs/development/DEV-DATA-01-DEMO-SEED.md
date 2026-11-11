# DEV-DATA-01 — Demo retail seed

## Scope and current evidence

`prisma/seed-demo.ts` is a staging-only, dedicated seed. It does not replace or invoke `prisma/seed.ts`. The legacy seed remains the default configured Prisma seed. No staging writes have been performed by this implementation work; therefore measured post-seed metrics are **not available** and no loaded-row claim is made here. Use `lucem-seed-demo --verify` after an authorized seed to record real PostgreSQL counts.

The deterministic plan is nine synthetic businesses (ROPA, PAPELERIA, ABARROTES, FERRETERIA, BELLEZA, HOGAR, ELECTRONICA, SERVICIOS, OTRO/Carnicería), 10,000 products each, four giro-specific categories each, and 12,000 variants/business (one per product plus a second variant for 2,000 products). Prices and costs are MXN with two decimals. Every variant receives a unique business-scoped SKU and a synthetic EAN-13 check-digit barcode. Stock includes zero, low, and normal ranges; abarrotes/carnicería use fractional quantities. Services remain stock zero and have no sales. Product images are not downloaded.

Each positive initial stock has a deterministic `INITIAL` Kardex movement and audit entry. Retail businesses receive one deterministic confirmed sale, active reservation, and partial return. Each operation uses a transaction, signed stock deltas, and a corresponding audit record, with role-authorized demo identities. The service giro receives no commercial operations. Product/catalog batches use `createMany` in at-most-500-row transactions; each business is generated incrementally to keep memory bounded. Stable IDs and collision checks allow safe reruns without deleting or updating unrelated records.

## Guarded commands

Install the user-local command from the repository root:

```sh
npm run db:seed:demo:install
```

The installer places an executable wrapper in `$HOME/.local/bin/lucem-seed-demo` (ensure that directory is on `PATH`). Read-only commands are:

```sh
lucem-seed-demo --dry-run
lucem-seed-demo --verify
```

The seed insists on database `lucem_staging`, DB user `lucem_staging`, port `5432`, configured host `172.19.0.3`, server-reported address normalized from CIDR, and exactly six successful Prisma migrations. There is no target fallback. Dry-run and verify do not create credentials or write database rows.

Default `lucem-seed-demo` requires interactive sudo. Its launcher inspects only the already-running `lucem-retail-staging` Compose DB/app containers; it never starts Compose, runs migrations, changes Docker permissions, or stores sudo credentials. It makes a PostgreSQL custom-format dump and an archive of `/app/public/uploads/products`, checks both checksums, validates the dump with `pg_restore --list` and performs a full restore into a throwaway local PostgreSQL instance inside a `--network none` container, validates the tar archive, then writes a mode-0600 manifest in `$HOME/lucem-staging-backups` (directory mode 0700). Only then does the unprivileged host Node process connect directly to the inspected internal DB address and run the seed. The seed independently checks the fresh manifest, file permissions, paths, checksums, target and migrations before writes. Host `pg_dump`/`psql` are not required.

If interactive sudo is unavailable, the default command stops before Docker access, backup, credentials, or DB writes. The operator must run `lucem-seed-demo` in an interactive terminal after reviewing the exact target and backups.

## Credentials and data safety

Three independently generated 36-byte crypto-random passwords are bcryptjs-hashed for ADMIN, SELLER, and INVENTORY_MANAGER identities. The only plaintext credential location is `$HOME/.local/share/lucem-retail-demo/credentials.json` (directory 0700, file 0600); command output mentions no email, password, or hash. Reruns reuse and validate that file and verify each password against its existing bcrypt hash; `--verify` also checks permissions and each bcrypt correspondence read-only. If demo users already exist but the file is absent, the run aborts. Do not copy this file into the repository or backups.

The seed writes only deterministic demo IDs. Existing deterministic IDs are checked against expected values; unrelated SKU/barcode/ID conflicts abort. It never clears tables, resets operational rate-limit buckets, changes upload counters, creates sessions, or writes user photos. `AbuseRateLimitBucket` and `UploadQuotaCounter` are outside the seed's write set.

## Metrics and limitations

Metrics must be copied from the successful `--verify` table, not inferred from the plan. Record products, variants, categories, movements, sales, reservations and returns per business, plus database size and resource observations, after the authorized staging run. At implementation time those actual post-seed metrics are unavailable because staging execution is expressly excluded. The isolated Playwright pagination test records loopback response time and uses a 1,000 ms per-response ceiling while exercising pages, filters, search, and ordering.

The application schema has no non-inventory service flag or service-only sales flow. Services are catalog entries with zero stock and are excluded from sales. The seed's synthetic sales/reservations/returns exist to exercise supported inventory-backed workflows; they are not real customer or commercial data. Batches are resumable but require the local protected credential file for reruns.
