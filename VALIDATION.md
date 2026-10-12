# Proofly validation — October 12, 2026

## Completed checks

### Latest review on October 12, 2026

- After fixes, lint, production build (including TypeScript), and all 13 tests passed.
- Development-server smoke checks passed for all five paths and 30 referenced JavaScript/CSS assets. These checks do not exercise browser interactions.
- Fixed acceptance of a trailing newline in a protocol Memo, delayed RPC indexing after confirmation (bounded retries without resubmission), same-document file reselection, and same-tab history notifications.
- The registration test now simulates delayed RPC indexing and verifies exactly one wallet submission across two status reads.
- The test runner required execution outside the sandbox because Windows `os.userInfo()` failed inside it with `uv_os_get_passwd ENOMEM`; the application build did not require this workaround.
- A fresh dependency audit still reports 24 vulnerabilities (16 high, 8 moderate, 0 critical). Dependency risks remain unresolved.
- Real Phantom signing and browser interaction/layout checks remain outstanding; no browser automation connector is available in this session.

- `npm run typecheck`: passed, including source and TypeScript test files.
- `npm run lint`: passed with no warnings or errors.
- `npm test`: 13 tests passed, 0 failed.
- `npm run build`: production Next.js 16.4.0 / Turbopack build passed. All five requested route patterns generated.
- Production HTTP smoke checks: `/`, `/register`, `/verify`, `/dashboard`, `/proof/invalid` returned HTTP 200 and HTML. This verifies server rendering, not client interactivity or visual layout.
- `node scripts/smoke.mjs` also confirmed that all 12 referenced JavaScript/CSS assets on the registration page returned HTTP 200.
- Real public Solana Devnet RPC responded to `getVersion`, `getGenesisHash`, and confirmed `getSlot`. Observed genesis: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`; observed confirmed slot: `510230931`. Availability is a point-in-time check.

## Test coverage

1. Exact browser SHA-256 matches an independent Node crypto digest, and changed bytes differ.
2. Empty, oversized, wrong-extension, and invalid-header PDF inputs are rejected.
3. Memo parsing enforces exact protocol/version and a lowercase 64-character hexadecimal hash.
4. Valid successful signed proof parsing returns the recording signer and chain timestamp.
5. Failed, unsigned, wrong-program, duplicate, malformed, and signer-free proofs are rejected.
6. Transaction signatures require base58 decoding to 64 bytes.
7. Wallet-rejection and insufficient-funding messages are actionable.
8. Network failure returns Network Error without successful proof data.
9. Wrong genesis hash prevents a wallet submission and proof reading.
10. Wallet rejection propagates without a submitted transaction signature.
11. Unknown, processed, and failed transaction statuses never verify.
12. Registration orchestration confirms and reads a raw Memo transaction through isolated SDK method fixtures.
13. Failed confirmation retains the submitted signature and never returns success.

Tests 9–13 isolate RPC/wallet behavior using test-only fixtures. They are not evidence of a real signed Devnet registration. No fixture transaction or hardcoded success is used in runtime application code.

## Outstanding verification

No connected user Phantom wallet or funded signing session was available. A real wallet-approved registration, cross-browser verification of that registration, wallet popup behavior, and insufficient-funds preflight remain to be tested manually. No browser automation or screenshot tool was available, so client interactions, QR scanning, clipboard behavior, receipts, and mobile/desktop visual layouts remain unverified. Responsive styles and accessible controls are implemented.

GitHub publication and Vercel deployment are prepared but were not performed; no connected deployment account or source repository was supplied.

## Dependency audit

`npm audit` reported 24 transitive/direct inherited advisories: 16 high and 8 moderate, with no critical advisories. The report includes React Native/mobile wallet dependency paths, `braces`/`micromatch` inherited through tooling, and `uuid`/`stream-json` via `jayson` in Solana web3.js. Several dependencies have no compatible automatic fix; npm's suggested force downgrade of the Next.js lint configuration would mismatch this Next.js version and was not applied. Review and resolve these dependency paths before claiming production readiness. The build and tests passing does not resolve dependency advisories.
