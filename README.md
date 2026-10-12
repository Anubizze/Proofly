# Proofly

**Trust Every Document. Verify On-Chain.**

Privacy-first PDF integrity proofs on Solana Devnet. Proofly hashes document bytes locally, asks Phantom to sign a real Memo transaction, and independently retrieves and verifies that transaction. PDF contents never leave the browser.

## Run locally

Node.js 22+ and npm are recommended. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Routes: `/`, `/register`, `/verify`, `/dashboard`, `/proof/[signature]`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Environment

`NEXT_PUBLIC_SOLANA_RPC_URL`: a **Solana Devnet** RPC URL, default `https://api.devnet.solana.com`. Public RPC is rate-limited. For a hosted demo, configure a dedicated browser-accessible Devnet RPC with allowed origins. This variable is bundled into the client: never place a private secret here. Browser RPC needs CORS support.

`NEXT_PUBLIC_GITHUB_URL`: optional actual source repository URL for the footer. No invented repository links are displayed.

## Phantom and Devnet

Install Phantom from https://phantom.app and enable its test-network settings. Choose Solana Devnet. Never share your seed phrase. Obtain test SOL at https://faucet.solana.com using your public wallet address. Connect from a secure browser context (HTTPS or localhost), select a PDF up to 20 MB, and approve the registration transaction. Proofly uses Wallet Standard discovery through the Solana wallet adapter React provider; Phantom must be installed or its mobile in-app browser used.

Verify from another browser with the exact PDF and signature without connecting a wallet. Change the PDF bytes and verify again: the result must be Mismatch. To confirm an expected recording wallet, use the optional expected-wallet field, obtained through a trusted external channel.

## Proof protocol and trust model

Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`.

Memo bytes: `PROOFLY:v1:SHA256:<64 lowercase hexadecimal characters>`.

Registration creates a legacy transaction with the wallet as fee payer and the **required Memo signer**, sends it using the wallet adapter, and confirms against its blockhash and last valid block height. Confirmation metadata is read back before saving success. A submitted signature remains visible even if confirmation fails; inspect the public proof page before retrying to avoid duplicates.

Verification retrieves signature status and the raw transaction, checks confirmed/finalized status, successful execution, the exact Memo program and format, and exactly one matching top-level Memo with exactly one required signer. Raw instruction account indexes are resolved against transaction account keys, including version-0 loaded addresses. Parsed Memo output alone is insufficient because RPC parsing drops the Memo account list. Ambiguous multi-proof transactions and unsigned memos are rejected. Inner CPI memos are outside this v1 protocol.

Both registration and verification check the actual Devnet genesis hash before proceeding, preventing an accidentally configured Mainnet endpoint from being used under Devnet labels. HTTP RPC requests time out after 20 seconds; a submitted transaction may still confirm even when a subsequent request fails.

Unknown signatures return Pending with an explicit unknown/not-yet-available explanation. Network errors never become Verified. Blockchain timestamp may be unavailable. Verification reports the recording address; cryptographic signing does not establish a real-world identity. Integrity does **not** prove legal validity, document truthfulness, authority, or issuer authenticity.

## Architecture

Next.js App Router + React + TypeScript → client Web Crypto SHA-256 → Wallet Standard Phantom → Solana web3.js v1 transaction → Memo Program → Devnet RPC confirmation and reads.

Tailwind CSS, reusable shadcn-style Button with Radix Slot, Lucide icons, Motion, React Hook Form/Zod, Sonner toasts, and QR proof sharing. No backend, database, document uploads, custom smart contract, or private-key storage. Original filenames are only saved in optional browser-local history; only the hash and signing address are on-chain. SHA-256 fingerprints are public and may reveal whether an already-known file was registered; do not treat hashes as encryption.

History is limited to the latest 200 successful registrations saved by this browser, is not an on-chain account index, and can be cleared independently of on-chain records. History status reflects the last confirmed registration; open a public proof to query current RPC state. Devnet can reset. JSON receipts are convenient exports, not independently signed certificates; validate the referenced transaction.

## Tests and demo verification

Unit tests cover exact hashing, PDF validation, byte changes, strict Memo parsing, required signer binding, failed transactions, wrong program IDs, duplicate and malformed proofs, signatures, wallet rejection messaging, and network failures. Synthetic transactions exist only inside isolated tests, never in the app.

See [VALIDATION.md](VALIDATION.md) for recorded checks and outstanding verification limits.

Live end-to-end signing requires a user-controlled Phantom wallet with Devnet SOL. Automated test results do not establish a successful real Devnet transaction. Browser layout and wallet signing must also be checked manually when no browser automation is available.

Manual release checklist: open desktop and mobile layouts; register a PDF using Phantom; reject a wallet request; attempt with an unfunded test wallet; open the resulting Explorer link and public proof page; verify in an unconnected browser; modify bytes and verify mismatch; test another signer, failed transaction, invalid memo, unknown signature, and unavailable RPC; confirm browser Network contains RPC requests but no PDF uploads.

## Deploy to Vercel / GitHub

Create a GitHub repository for this directory, commit source and `package-lock.json`, and push. Import it in Vercel with the Next.js preset. Set the environment variables above, then deploy. Vercel runs `npm run build`. Redeploy after changing public environment values. Keep `.env.local` ignored. No GitHub repository or public deployment is created automatically without an account connection.

## Submission

See [HACKATHON.md](HACKATHON.md) for positioning, roadmap, architecture, and demo narration.

## Official references

- [Next.js App Router installation](https://nextjs.org/docs/app/getting-started/installation)
- [Solana Memo Program and signer semantics](https://www.solana-program.com/docs/memo)
- [Solana transaction structure](https://solana.com/docs/core/transactions)
