import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";
export const MEMO = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);
export const PREFIX = "PROOFLY:v1:SHA256:";
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const rpc = () =>
  new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    {
      commitment: "confirmed",
      disableRetryOnRateLimit: true,
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }),
    },
  );
export type Proof = {
  signature: string;
  hash: string;
  signer: string;
  timestamp: number | null;
  slot: number;
  confirmation: string;
};
export class ProofError extends Error {
  constructor(
    public status: "Invalid Proof" | "Pending" | "Network Error",
    message: string,
  ) {
    super(message);
  }
}
export async function assertDevnet(connection: Connection) {
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS)
    throw new ProofError(
      "Network Error",
      "RPC endpoint is not Solana Devnet. Update NEXT_PUBLIC_SOLANA_RPC_URL before continuing.",
    );
}
export function parseMemo(text: string) {
  if (text.length !== PREFIX.length + 64) return null;
  const match = /^PROOFLY:v1:SHA256:([0-9a-f]{64})$/.exec(text);
  return match?.[1] ?? null;
}
export function validateSignature(signature: string) {
  try {
    return bs58.decode(signature).length === 64;
  } catch {
    return false;
  }
}
export async function hashPdf(file: File) {
  if (file.size === 0 || file.size > 20 * 1024 * 1024)
    throw new Error("Choose a PDF between 1 byte and 20 MB.");
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  )
    throw new Error("Only PDF files are supported.");
  const bytes = await file.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("This file does not contain a valid PDF header.");
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function extractProof(
  tx: ParsedTransactionWithMeta,
  signature: string,
  confirmation: string,
): Proof {
  if (!tx.meta || tx.meta.err)
    throw new ProofError(
      "Invalid Proof",
      "Transaction execution failed or metadata is missing.",
    );
  const proofs: Proof[] = [];
  for (const ix of tx.transaction.message.instructions) {
    if (!ix.programId.equals(MEMO)) continue;
    let memo: string;
    let accounts: PublicKey[] = [];
    if ("parsed" in ix) {
      if (typeof ix.parsed !== "string") continue;
      memo = ix.parsed;
    } else {
      try {
        memo = new TextDecoder("utf-8", { fatal: true }).decode(
          bs58.decode(ix.data),
        );
        accounts = ix.accounts;
      } catch {
        continue;
      }
    }
    const hash = parseMemo(memo);
    if (!hash) continue;
    // Parsed Memo RPC output discards account metas: retrieve raw transaction for signer binding in readProof.
    if (!accounts.length) continue;
    const signers = accounts.filter((a) =>
      tx.transaction.message.accountKeys.some(
        (k) => k.pubkey.equals(a) && k.signer,
      ),
    );
    if (signers.length !== accounts.length || signers.length !== 1) continue;
    proofs.push({
      signature,
      hash,
      signer: signers[0].toBase58(),
      timestamp: tx.blockTime ?? null,
      slot: tx.slot,
      confirmation,
    });
  }
  if (proofs.length !== 1)
    throw new ProofError(
      "Invalid Proof",
      "Expected exactly one Proofly Memo with exactly one required transaction signer.",
    );
  return proofs[0];
}
export async function readProof(signature: string): Promise<Proof> {
  if (!validateSignature(signature))
    throw new ProofError(
      "Invalid Proof",
      "Enter a valid 64-byte Solana transaction signature.",
    );
  try {
    const connection = rpc();
    await assertDevnet(connection);
    const {
      value: [status],
    } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    if (!status)
      throw new ProofError(
        "Pending",
        "Transaction is not yet available on Devnet, or the signature is unknown.",
      );
    if (status.err)
      throw new ProofError("Invalid Proof", "The transaction failed on-chain.");
    if (
      status.confirmationStatus !== "confirmed" &&
      status.confirmationStatus !== "finalized"
    )
      throw new ProofError("Pending", "Waiting for blockchain confirmation.");
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx)
      throw new ProofError(
        "Pending",
        "Confirmed transaction details are not available yet.",
      );
    const message = tx.transaction.message;
    const keys = message.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses,
    });
    const instructions = message.compiledInstructions.map((ix) => ({
      programId: keys.get(ix.programIdIndex)!,
      accounts: ix.accountKeyIndexes.map((i) => keys.get(i)!),
      data: bs58.encode(ix.data),
    }));
    return extractProof(
      {
        blockTime: tx.blockTime,
        slot: tx.slot,
        meta: tx.meta ? { ...tx.meta, innerInstructions: undefined } : null,
        transaction: {
          signatures: tx.transaction.signatures,
          message: {
            accountKeys: Array.from({ length: keys.length }, (_, i) => ({
              pubkey: keys.get(i)!,
              signer: message.isAccountSigner(i),
              writable: message.isAccountWritable(i),
            })),
            instructions,
            recentBlockhash: message.recentBlockhash,
          },
        },
      },
      signature,
      status.confirmationStatus,
    );
  } catch (error) {
    if (error instanceof ProofError) throw error;
    throw new ProofError(
      "Network Error",
      "Devnet RPC could not complete the request. Please retry or configure a dedicated RPC endpoint.",
    );
  }
}
export async function registerProof(
  hash: string,
  wallet: PublicKey,
  send: (tx: Transaction, c: Connection) => Promise<string>,
  onSubmitted: (s: string) => void,
) {
  if (!parseMemo(PREFIX + hash)) throw new Error("Invalid document hash.");
  const connection = rpc();
  await assertDevnet(connection);
  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ ...latest, feePayer: wallet }).add(
    new TransactionInstruction({
      programId: MEMO,
      keys: [{ pubkey: wallet, isSigner: true, isWritable: false }],
      data: Buffer.from(PREFIX + hash, "utf8"),
    }),
  );
  const signature = await send(tx, connection);
  onSubmitted(signature);
  const result = await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
  if (result.value.err) throw new Error("Transaction execution failed.");
  // RPC indexing can lag behind confirmation. Retry only pending reads;
  // never resend the wallet transaction or accept an unverified result.
  let proof: Proof | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      proof = await readProof(signature);
      break;
    } catch (error) {
      if (!(error instanceof ProofError) || error.status !== "Pending" || attempt === 3)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  if (!proof) throw new ProofError("Pending", "Proof details are not available yet. Keep your transaction signature and refresh the public proof.");
  if (proof.hash !== hash || proof.signer !== wallet.toBase58())
    throw new Error("Confirmed proof does not match the request.");
  return proof;
}
export function friendlyError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  if (/reject|4001/i.test(msg))
    return "Wallet request declined. No proof was registered by this request.";
  if (/insufficient|debit|credit/i.test(msg))
    return "Insufficient Devnet SOL. Fund your wallet using the Solana faucet.";
  return msg;
}
export const explorer = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
export const short = (s: string) =>
  s.length > 16 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s;
