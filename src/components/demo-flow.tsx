"use client";

import { useState } from "react";
import { hashPdf, friendlyError } from "@/lib/proof";
import { Button } from "./ui/button";

const STORAGE = "proofly:simulated-proofs:v1";

export function DemoFlow({ mode }: { mode: "register" | "verify" }) {
  const [file, setFile] = useState<File | null>(null);
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const hash = await hashPdf(file);
      const records: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      if (mode === "register") {
        const id = `demo-${crypto.randomUUID()}`;
        records[id] = hash;
        localStorage.setItem(STORAGE, JSON.stringify(records));
        setSignature(id);
        setMessage("Registered (simulated). Copy this demo reference and use the same PDF on the Verify page in demo mode.");
      } else {
        const expected = records[signature.trim()];
        setMessage(!expected
          ? "Demo reference not found. Register a PDF in demo mode in this browser first."
          : expected === hash
            ? "Verified (simulated). This PDF matches the locally saved demo fingerprint."
            : "Mismatch (simulated). This PDF differs from the demo document.");
      }
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card workflow">
      <h3>Demo — simulated data</h3>
      <p>No blockchain transaction or wallet request is made. Demo records stay in this browser and are not on-chain proofs.</p>
      <label className="field-label" htmlFor="demo-pdf">Select a PDF (up to 20 MB)</label>
      <input id="demo-pdf" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(e) => { setFile(e.target.files?.[0] || null); setMessage(""); }} />
      <label className="field-label" htmlFor="demo-reference">Demo reference — not a transaction signature</label>
      <input id="demo-reference" value={signature} readOnly={mode === "register"} disabled={busy} placeholder="demo-…" onChange={(e) => { setSignature(e.target.value); setMessage(""); }} />
      <Button className="full" disabled={busy || !file || (mode === "verify" && !signature.trim())} onClick={() => void run()}>
        {busy ? "Processing…" : mode === "register" ? "Register demo document" : "Verify demo document"}
      </Button>
      {message && <div className="result-banner warning" role="status"><div><strong>Demo — simulated data</strong><p>{message}</p></div></div>}
    </section>
  );
}
