"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Copy,
  Loader2,
  ShieldCheck,
  LockKeyhole,
  Download,
} from "lucide-react";
import {
  hashPdf,
  readProof,
  registerProof,
  ProofError,
  friendlyError,
  explorer,
  validateSignature,
  rpc,
  assertDevnet,
  type Proof,
} from "@/lib/proof";
import { Button } from "./ui/button";
import { WalletButton } from "./providers";
import { DemoFlow } from "./demo-flow";
export type SavedProof = Proof & { filename: string };
export const HISTORY = "proofly:devnet:history:v1";
export function saveProof(proof: SavedProof) {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY) || "[]");
    const history = Array.isArray(raw) ? raw : [];
    localStorage.setItem(
      HISTORY,
      JSON.stringify(
        [
          proof,
          ...history.filter((p: SavedProof) => p.signature !== proof.signature),
        ].slice(0, 200),
      ),
    );
    window.dispatchEvent(new Event("proofly:history-changed"));
  } catch {
    toast.warning(
      "Proof confirmed, but browser history could not be saved. Keep your signature.",
    );
  }
}
export function Upload({
  onChange,
  disabled = false,
}: {
  onChange: (file: File | null, hash: string) => void;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  async function choose(f?: File) {
    if (!f || disabled || busy) return;
    setBusy(true);
    setError("");
    setFile(null);
    onChange(null, "");
    try {
      const hash = await hashPdf(f);
      setFile(f);
      onChange(f, hash);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label
        className={`upload ${drag ? "drag" : ""} ${disabled ? "disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void choose(e.dataTransfer.files[0]);
        }}
      >
        <input
          aria-label="Upload a PDF"
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled || busy}
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            e.target.value = "";
            void choose(selectedFile);
          }}
        />
        <span className="upload-icon">
          {busy ? (
            <Loader2 className="spin" />
          ) : file ? (
            <FileText />
          ) : (
            <UploadCloud />
          )}
        </span>
        <strong>
          {busy
            ? "Generating your fingerprint…"
            : file
              ? file.name
              : "Drop your document here"}
        </strong>
        <span>
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · Click to replace`
            : "or click to browse your files"}
        </span>
        <small>PDF only · Maximum 20 MB · Never uploaded</small>
      </label>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </>
  );
}
export async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Clipboard unavailable. Select and copy the displayed value.");
  }
}
const subscribeOrigin = () => () => {};
const readOrigin = () => window.location.origin;
export function ProofDetails({ proof }: { proof: Proof }) {
  const origin = useSyncExternalStore(subscribeOrigin, readOrigin, () => "");
  const url = origin ? `${origin}/proof/${proof.signature}` : "";
  function receipt() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            platform: "Proofly",
            network: "Solana Devnet",
            ...proof,
            proofUrl: url,
            notice:
              "Document integrity only; not legal validity, truthfulness, or issuer identity.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `proofly-${proof.signature.slice(0, 8)}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
  return (
    <div className="proof-details">
      <dl>
        {[
          ["Document hash", proof.hash],
          ["Recording wallet", proof.signer],
          ["Transaction signature", proof.signature],
          [
            "Blockchain timestamp",
            proof.timestamp
              ? new Date(proof.timestamp * 1000).toLocaleString()
              : "Unavailable from RPC",
          ],
          ["Confirmation", proof.confirmation],
          ["Network", "Solana Devnet · Test network"],
          ["Slot", String(proof.slot)],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>
              {value}
              {[
                "Document hash",
                "Recording wallet",
                "Transaction signature",
              ].includes(key) && (
                <button
                  className="icon-button"
                  aria-label={`Copy ${key}`}
                  onClick={() => void copy(value)}
                >
                  <Copy size={14} />
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="result-actions">
        <a
          className="button secondary"
          href={explorer(proof.signature)}
          target="_blank"
          rel="noreferrer"
        >
          View on Explorer <ArrowUpRight size={16} />
        </a>
        <Button className="secondary" onClick={() => void copy(url)}>
          Copy proof link <Copy size={15} />
        </Button>
        <Button className="secondary" onClick={receipt}>
          <Download size={15} /> Receipt
        </Button>
      </div>
      {url && (
        <div className="qr-row">
          <QRCodeSVG
            value={url}
            size={88}
            bgColor="#ffffff"
            fgColor="#071512"
            marginSize={2}
          />
          <span>
            Share an independently verifiable proof.
            <small>Anyone can open this link. No wallet needed.</small>
            <Link href={`/proof/${proof.signature}`}>Open public proof ↗</Link>
          </span>
        </div>
      )}
    </div>
  );
}
const schema = z.object({
  signature: z
    .string()
    .trim()
    .refine(validateSignature, "Enter a valid Solana transaction signature."),
  expectedSigner: z.string().trim().optional(),
});
export function DocumentFlow(props: {
  mode: "register" | "verify" | "proof";
  initialSignature?: string;
}) {
  const [demo, setDemo] = useState(false);
  return (
    <>
      {props.mode !== "proof" && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            {demo ? "Demo — simulated data" : "Enable demo mode (simulated data)"}
          </label>
          {demo && <p>Local demonstration only. No Solana transaction, Phantom approval, or real on-chain verification.</p>}
        </div>
      )}
      {demo && props.mode !== "proof" ? <DemoFlow mode={props.mode} /> : <LiveDocumentFlow {...props} />}
    </>
  );
}

function LiveDocumentFlow({
  mode,
  initialSignature,
}: {
  mode: "register" | "verify" | "proof";
  initialSignature?: string;
}) {
  const wallet = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [busy, setBusy] = useState(mode === "proof");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [attempted, setAttempted] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { signature: initialSignature || "", expectedSigner: "" },
  });
  const [retry, setRetry] = useState(0);
  const [networkState, setNetworkState] = useState("Checking Devnet RPC…");
  useEffect(() => {
    let active = true;
    assertDevnet(rpc())
      .then(() => {
        if (active) setNetworkState("Devnet RPC reachable");
      })
      .catch(() => {
        if (active) setNetworkState("Devnet RPC unavailable or misconfigured");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (mode !== "proof" || !initialSignature) return;
    let active = true;
    readProof(initialSignature)
      .then((p) => {
        if (active) setProof(p);
      })
      .catch((e) => {
        if (active) {
          setStatus(e instanceof ProofError ? e.status : "Network Error");
          setMessage(friendlyError(e));
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [mode, initialSignature, retry]);
  function selected(f: File | null, h: string) {
    setFile(f);
    setHash(h);
    setAttempted(false);
    if (mode !== "proof") {
      setProof(null);
      setStatus("");
      setMessage("");
    }
  }
  function clearVerification() {
    setProof(null);
    setStatus("");
    setMessage("");
    setAttempted(false);
  }
  async function register() {
    if (!hash || !file || !wallet.publicKey) return;
    setBusy(true);
    setProof(null);
    setStatus("");
    setMessage("Approve the transaction in Phantom.");
    setSubmitted("");
    try {
      const p = await registerProof(
        hash,
        wallet.publicKey,
        (tx, c) => wallet.sendTransaction(tx, c),
        (s) => {
          setSubmitted(s);
          setMessage("Transaction submitted. Waiting for Devnet confirmation…");
        },
      );
      setProof(p);
      saveProof({ ...p, filename: file.name });
      setStatus("Registered");
      setMessage("Your fingerprint is confirmed on Solana Devnet.");
      toast.success("Document proof registered");
    } catch (e) {
      setStatus(e instanceof ProofError ? e.status : "Registration error");
      setMessage(friendlyError(e));
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify(values: z.infer<typeof schema>) {
    if (!hash) {
      toast.error("Choose a PDF first.");
      return;
    }
    setBusy(true);
    setProof(null);
    setStatus("");
    setAttempted(false);
    try {
      const p = await readProof(values.signature);
      setProof(p);
      setAttempted(true);
      if (values.expectedSigner && values.expectedSigner !== p.signer) {
        setStatus("Invalid Proof");
        setMessage("Recording wallet does not match the expected signer.");
      } else {
        setStatus(p.hash === hash ? "Verified" : "Mismatch");
        setMessage(
          p.hash === hash
            ? "This PDF matches the confirmed on-chain fingerprint."
            : "This PDF differs from the registered document.",
        );
      }
    } catch (e) {
      setStatus(e instanceof ProofError ? e.status : "Network Error");
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const publicMatch = mode === "proof" && proof && hash;
  const displayStatus = publicMatch
    ? proof.hash === hash
      ? "Verified"
      : "Mismatch"
    : status;
  return (
    <div className="flow-grid">
      <section className="card workflow">
        <div className="card-title">
          <span className="number-badge">01</span>
          <div>
            <h3>
              {mode === "proof" ? "Compare a document" : "Choose your document"}
            </h3>
            <p>Generate a private fingerprint from your PDF.</p>
          </div>
          <LockKeyhole size={18} />
        </div>
        <Upload onChange={selected} disabled={busy} />
        {hash && (
          <div className="hash-box">
            <span>
              <FingerprintIcon /> SHA-256 fingerprint{" "}
              <button
                aria-label="Copy document hash"
                onClick={() => void copy(hash)}
              >
                <Copy size={14} />
              </button>
            </span>
            <code>{hash}</code>
          </div>
        )}
        {mode === "register" ? (
          <>
            <div className="card-title second-step">
              <span className="number-badge">02</span>
              <div>
                <h3>Register on Solana</h3>
                <p>Your wallet signs. Devnet records the proof.</p>
              </div>
            </div>
            <div className="wallet-info">
              <span>
                {wallet.publicKey
                  ? wallet.publicKey.toBase58()
                  : "Connect Phantom to register your document."}
              </span>
              <WalletButton />
            </div>
            <Button
              className="full"
              disabled={busy || !hash || !wallet.connected}
              onClick={() => void register()}
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" /> Confirming proof…
                </>
              ) : (
                <>
                  Register document <ArrowUpRight size={17} />
                </>
              )}
            </Button>
            <p className="field-note">
              Requires a small amount of test SOL for the network fee.{" "}
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noreferrer"
              >
                Get Devnet SOL ↗
              </a>
            </p>
          </>
        ) : mode === "verify" ? (
          <form onSubmit={form.handleSubmit(verify)}>
            <div className="card-title second-step">
              <span className="number-badge">02</span>
              <div>
                <h3>Find the on-chain proof</h3>
                <p>Paste the signature shared by the recording wallet.</p>
              </div>
            </div>
            <label className="field-label" htmlFor="signature">
              Transaction signature
            </label>
            <textarea
              id="signature"
              placeholder="Paste a Solana Devnet transaction signature"
              {...form.register("signature", { onChange: clearVerification })}
              disabled={busy}
            />
            {form.formState.errors.signature && (
              <p className="error-text">
                {form.formState.errors.signature.message}
              </p>
            )}
            <label className="field-label" htmlFor="expectedSigner">
              Expected recording wallet <span>(optional)</span>
            </label>
            <input
              id="expectedSigner"
              placeholder="Compare with a wallet address you trust"
              {...form.register("expectedSigner", {
                onChange: clearVerification,
              })}
              disabled={busy}
            />
            <Button className="full" disabled={busy || !hash} type="submit">
              {busy ? (
                <>
                  <Loader2 size={17} className="spin" /> Reading Devnet…
                </>
              ) : (
                <>
                  Verify document <ShieldCheck size={18} />
                </>
              )}
            </Button>
            <p className="field-note">No wallet connection required.</p>
          </form>
        ) : (
          <p className="field-note">
            The uploaded PDF is compared locally with this proof. No wallet
            required.
          </p>
        )}
        {submitted && !proof && (
          <div className="submitted">
            <strong>Submitted transaction — keep this signature</strong>
            <code>{submitted}</code>
            <Link href={`/proof/${submitted}`}>
              Check public proof / retry confirmation ↗
            </Link>
            <a href={explorer(submitted)} target="_blank" rel="noreferrer">
              Open Solana Explorer ↗
            </a>
          </div>
        )}
        {(message || publicMatch) && (
          <div
            role="status"
            className={`result-banner ${displayStatus === "Verified" || displayStatus === "Registered" ? "success" : "warning"}`}
          >
            {displayStatus === "Verified" || displayStatus === "Registered" ? (
              <CheckCircle2 />
            ) : (
              <AlertTriangle />
            )}
            <div>
              <strong>{displayStatus || "Registration in progress"}</strong>
              <p>
                {publicMatch
                  ? proof.hash === hash
                    ? "This document matches the on-chain hash."
                    : "This document differs from the on-chain hash."
                  : message}
              </p>
            </div>
          </div>
        )}
        {mode === "proof" && !proof && !busy && (
          <Button
            className="secondary full"
            onClick={() => {
              setBusy(true);
              setStatus("");
              setMessage("");
              setRetry((value) => value + 1);
            }}
          >
            Refresh proof status
          </Button>
        )}
        {proof && <ProofDetails proof={proof} />}
      </section>
      <aside className="flow-aside">
        <div className="card">
          <span className="kicker">
            {mode === "register"
              ? "A PROOF, NOT AN UPLOAD"
              : "INDEPENDENT VERIFICATION"}
          </span>
          <h3>
            {mode === "register"
              ? "Your document stays private."
              : "Trust the bytes. Check the chain."}
          </h3>
          <p>
            Proofly uses SHA-256 to create a fingerprint of your exact file.
            Even a one-byte change produces a different fingerprint.
          </p>
          <div className="aside-item">
            <LockKeyhole />
            <span>Original PDF stays on your device</span>
          </div>
          <div className="aside-item">
            <ShieldCheck />
            <span>Confirmed Memo on Solana Devnet</span>
          </div>
          <div className="aside-item">
            <FileText />
            <span>Public proof, private contents</span>
          </div>
        </div>
        <div className="notice">
          <AlertTriangle size={19} />
          <div>
            <strong>What a proof means</strong>
            <p>
              A match confirms document integrity. It does not confirm
              truthfulness, legal validity, or the real-world identity of the
              recording wallet.
            </p>
          </div>
        </div>
        <div className="network-note">
          <span className="network">
            <i /> SOLANA DEVNET
          </span>
          <p>
            {networkState}. This is a test network. Test SOL has no monetary
            value and Devnet records may be reset.
          </p>
        </div>
      </aside>
      {busy && mode === "proof" && (
        <div className="card skeleton" aria-label="Loading proof" />
      )}
      {mode === "proof" && proof && !attempted && (
        <span className="sr-only">Proof loaded from Solana Devnet</span>
      )}
    </div>
  );
}
function FingerprintIcon() {
  return <ShieldCheck size={14} />;
}
