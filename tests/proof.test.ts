import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import bs58 from "bs58";
import {
  hashPdf,
  parseMemo,
  PREFIX,
  MEMO,
  extractProof,
  validateSignature,
  friendlyError,
  readProof,
  ProofError,
  DEVNET_GENESIS,
  registerProof,
} from "../src/lib/proof";
const hash = "a".repeat(64),
  signature = bs58.encode(new Uint8Array(64).fill(1));
const signer = new PublicKey("11111111111111111111111111111111");
function transaction(
  memo = PREFIX + hash,
  requiredSigner = true,
): ParsedTransactionWithMeta {
  return {
    slot: 42,
    blockTime: 1700000000,
    meta: { err: null, fee: 5000, preBalances: [], postBalances: [] },
    transaction: {
      signatures: [signature],
      message: {
        accountKeys: [
          { pubkey: signer, signer: requiredSigner, writable: true },
        ],
        recentBlockhash: signer.toBase58(),
        instructions: [
          {
            programId: MEMO,
            accounts: [signer],
            data: bs58.encode(new TextEncoder().encode(memo)),
          },
        ],
      },
    },
  };
}
test("SHA-256 matches independently computed bytes; modifications differ", async () => {
  const bytes = "%PDF-1.7\nDocument A";
  const file = new File([bytes], "document.pdf", { type: "application/pdf" });
  assert.equal(
    await hashPdf(file),
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.notEqual(
    await hashPdf(file),
    await hashPdf(
      new File([bytes + "changed"], "document.pdf", {
        type: "application/pdf",
      }),
    ),
  );
});
test("rejects empty, non-PDF, false PDF, and oversized files", async () => {
  for (const file of [
    new File([], "a.pdf"),
    new File(["%PDF-1.7"], "a.txt"),
    new File(["bad bytes"], "a.pdf"),
    new File([new Uint8Array(20 * 1024 * 1024 + 1)], "a.pdf"),
  ])
    await assert.rejects(hashPdf(file));
});
test("Memo format is exact, versioned, lowercase, 64 hex characters", () => {
  assert.equal(parseMemo(PREFIX + hash), hash);
  for (const m of [
    PREFIX + hash.toUpperCase(),
    PREFIX + hash + "\n",
    PREFIX + hash.slice(1),
    "OTHER:" + hash,
    "PROOFLY:v2:SHA256:" + hash,
  ])
    assert.equal(parseMemo(m), null);
});
test("accepts successful signed proof and returns blockchain metadata", () => {
  const proof = extractProof(transaction(), signature, "confirmed");
  assert.equal(proof.hash, hash);
  assert.equal(proof.signer, signer.toBase58());
  assert.equal(proof.timestamp, 1700000000);
});
test("rejects failed, unsigned, wrong program, malformed, duplicate proofs", () => {
  const failed = transaction();
  failed.meta!.err = { InstructionError: [0, "InvalidArgument"] };
  const unsigned = transaction(PREFIX + hash, false);
  const wrong = transaction();
  wrong.transaction.message.instructions[0].programId = signer;
  const duplicate = transaction();
  duplicate.transaction.message.instructions.push(
    duplicate.transaction.message.instructions[0],
  );
  const missing = transaction();
  const ix = missing.transaction.message.instructions[0];
  if ("accounts" in ix) ix.accounts = [];
  for (const tx of [
    failed,
    unsigned,
    wrong,
    duplicate,
    missing,
    transaction("bad memo"),
  ])
    assert.throws(() => extractProof(tx, signature, "confirmed"), ProofError);
});
test("signature validation checks decoded length", () => {
  assert.ok(validateSignature(signature));
  assert.equal(validateSignature("not_a_signature"), false);
  assert.equal(validateSignature(signer.toBase58()), false);
});
test("wallet rejection and insufficient funding have actionable messages", () => {
  assert.match(
    friendlyError(new Error("User rejected the request")),
    /declined/,
  );
  assert.match(friendlyError(new Error("insufficient funds")), /Devnet SOL/);
});
test("network failures cannot produce a successful proof", async () => {
  const stub = mock.method(Connection.prototype, "getGenesisHash", async () => {
    throw new Error("Offline");
  });
  try {
    await assert.rejects(
      readProof(signature),
      (e: unknown) => e instanceof ProofError && e.status === "Network Error",
    );
  } finally {
    stub.mock.restore();
  }
});

test("wrong RPC network blocks registration before wallet approval", async () => {
  const stub = mock.method(
    Connection.prototype,
    "getGenesisHash",
    async () => "mainnet-genesis",
  );
  let sent = false;
  try {
    await assert.rejects(
      registerProof(
        hash,
        signer,
        async () => {
          sent = true;
          return signature;
        },
        () => {},
      ),
      /not Solana Devnet/,
    );
    assert.equal(sent, false);
    await assert.rejects(readProof(signature), /not Solana Devnet/);
  } finally {
    stub.mock.restore();
  }
});

test("registration propagates wallet rejection without saving submitted signature", async () => {
  const genesis = mock.method(
    Connection.prototype,
    "getGenesisHash",
    async () => DEVNET_GENESIS,
  );
  const blockhash = mock.method(
    Connection.prototype,
    "getLatestBlockhash",
    async () => ({ blockhash: signer.toBase58(), lastValidBlockHeight: 100 }),
  );
  let submitted = false;
  try {
    await assert.rejects(
      registerProof(
        hash,
        signer,
        async (tx) => {
          assert.equal(tx.feePayer?.toBase58(), signer.toBase58());
          assert.ok(tx.instructions[0].programId.equals(MEMO));
          assert.equal(tx.instructions[0].keys[0].isSigner, true);
          assert.equal(tx.instructions[0].data.toString("utf8"), PREFIX + hash);
          throw new Error("User rejected the request");
        },
        () => {
          submitted = true;
        },
      ),
      /rejected/,
    );
    assert.equal(submitted, false);
  } finally {
    genesis.mock.restore();
    blockhash.mock.restore();
  }
});

test("unknown, processed, and failed transaction states never verify", async () => {
  const genesis = mock.method(
    Connection.prototype,
    "getGenesisHash",
    async () => DEVNET_GENESIS,
  );
  try {
    for (const [status, expected] of [
      [null, "Pending"],
      [{ err: null, confirmationStatus: "processed" }, "Pending"],
      [
        {
          err: { InstructionError: [0, "InvalidArgument"] },
          confirmationStatus: "confirmed",
        },
        "Invalid Proof",
      ],
    ] as const) {
      const stub = mock.method(
        Connection.prototype,
        "getSignatureStatuses",
        async () => ({ value: [status] }),
      );
      try {
        await assert.rejects(
          readProof(signature),
          (e: unknown) => e instanceof ProofError && e.status === expected,
        );
      } finally {
        stub.mock.restore();
      }
    }
  } finally {
    genesis.mock.restore();
  }
});

test("registration retries delayed RPC indexing without resubmitting the transaction", async (t) => {
  t.mock.method(
    Connection.prototype,
    "getGenesisHash",
    async () => DEVNET_GENESIS,
  );
  t.mock.method(Connection.prototype, "getLatestBlockhash", async () => ({
    blockhash: signer.toBase58(),
    lastValidBlockHeight: 100,
  }));
  t.mock.method(Connection.prototype, "confirmTransaction", async () => ({
    context: { slot: 42 },
    value: { err: null },
  }));
  let statusReads = 0;
  t.mock.method(Connection.prototype, "getSignatureStatuses", async () => {
    if (++statusReads === 1) return { context: { slot: 42 }, value: [null] };
    return ({
    context: { slot: 42 },
    value: [
      {
        slot: 42,
        confirmations: 1,
        err: null,
        confirmationStatus: "confirmed",
      },
    ],
    });
  });
  const tx = new Transaction({
    feePayer: signer,
    recentBlockhash: signer.toBase58(),
  }).add(
    new TransactionInstruction({
      programId: MEMO,
      keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
      data: Buffer.from(PREFIX + hash),
    }),
  );
  t.mock.method(Connection.prototype, "getTransaction", async () => ({
    slot: 42,
    blockTime: 1700000000,
    meta: { err: null, fee: 5000, preBalances: [], postBalances: [] },
    transaction: { signatures: [signature], message: tx.compileMessage() },
  }));
  let submitted = "";
  let sends = 0;
  const proof = await registerProof(
    hash,
    signer,
    async () => {
      sends++;
      return signature;
    },
    (s) => {
      submitted = s;
    },
  );
  assert.equal(submitted, signature);
  assert.equal(proof.hash, hash);
  assert.equal(proof.signer, signer.toBase58());
  assert.equal(proof.timestamp, 1700000000);
  assert.equal(statusReads, 2);
  assert.equal(sends, 1);
});

test("failed confirmation preserves submitted signature but never returns a proof", async (t) => {
  t.mock.method(
    Connection.prototype,
    "getGenesisHash",
    async () => DEVNET_GENESIS,
  );
  t.mock.method(Connection.prototype, "getLatestBlockhash", async () => ({
    blockhash: signer.toBase58(),
    lastValidBlockHeight: 100,
  }));
  t.mock.method(Connection.prototype, "confirmTransaction", async () => ({
    context: { slot: 42 },
    value: { err: { InstructionError: [0, "InvalidArgument"] } },
  }));
  let submitted = "";
  await assert.rejects(
    registerProof(
      hash,
      signer,
      async () => signature,
      (s) => {
        submitted = s;
      },
    ),
    /execution failed/,
  );
  assert.equal(submitted, signature);
});
