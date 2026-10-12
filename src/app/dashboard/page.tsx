"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {
  FileCheck2,
  ArrowUpRight,
  Search,
  Copy,
  FilePlus2,
  ScanLine,
  Wallet,
  Activity,
} from "lucide-react";
import { HISTORY, copy, type SavedProof } from "@/components/document-flow";
import {
  short,
  explorer,
  rpc,
  parseMemo,
  PREFIX,
  validateSignature,
  assertDevnet,
} from "@/lib/proof";
import { Button } from "@/components/ui/button";
function subscribeHistory(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("proofly:history-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("proofly:history-changed", callback);
  };
}
function readHistory() {
  try {
    return localStorage.getItem(HISTORY) || "[]";
  } catch {
    return "[]";
  }
}
export default function Dashboard() {
  const { publicKey } = useWallet();
  const rawHistory = useSyncExternalStore(
    subscribeHistory,
    readHistory,
    () => "[]",
  );
  const history = useMemo<SavedProof[]>(() => {
    try {
      const value = JSON.parse(rawHistory);
      return Array.isArray(value)
        ? value.filter(
            (p) =>
              p &&
              typeof p.filename === "string" &&
              typeof p.hash === "string" &&
              parseMemo(PREFIX + p.hash) &&
              typeof p.signature === "string" &&
              validateSignature(p.signature) &&
              typeof p.signer === "string",
          )
        : [];
    } catch {
      return [];
    }
  }, [rawHistory]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [network, setNetwork] = useState("Checking RPC…");
  useEffect(() => {
    let active = true;
    assertDevnet(rpc())
      .then(() => {
        if (active) setNetwork("RPC reachable");
      })
      .catch(() => {
        if (active) setNetwork("RPC unavailable");
      });
    return () => {
      active = false;
    };
  }, []);
  const filtered = history.filter(
    (p) =>
      (filter !== "wallet" || p.signer === publicKey?.toBase58()) &&
      `${p.filename} ${p.hash} ${p.signature} ${p.signer}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="workspace dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="kicker">YOUR TRUST WORKSPACE</span>
          <h1>Overview</h1>
          <p className="page-description">
            A clear view of the proofs saved in this browser.
          </p>
        </div>
        <Button asChild>
          <Link href="/register">
            <FilePlus2 size={17} /> Register document
          </Link>
        </Button>
      </div>
      <div className="stats">
        <div className="card stat">
          <span>
            Locally saved proofs <FileCheck2 size={20} />
          </span>
          <strong>{history.length.toString().padStart(2, "0")}</strong>
          <small>Confirmed registrations saved on this device</small>
        </div>
        <div className="card stat">
          <span>
            Connected wallet <Wallet size={20} />
          </span>
          <strong className="wallet-stat">
            {publicKey ? short(publicKey.toBase58()) : "Not connected"}
          </strong>
          <small>
            {publicKey
              ? "Phantom · Ready to register"
              : "Connect Phantom to create a proof"}
          </small>
        </div>
        <div className="card stat">
          <span>
            Solana Devnet <Activity size={20} />
          </span>
          <strong className="wallet-stat">{network}</strong>
          <small>Test network · No real monetary value</small>
        </div>
      </div>
      <div className="card history-card">
        <div className="history-title">
          <div>
            <h3>Document activity</h3>
            <p>
              Browser-local history is not a complete on-chain account history.
            </p>
          </div>
          <span className="count-badge">{history.length} proofs</span>
        </div>
        <div className="table-controls">
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Search saved proofs"
              placeholder="Search documents, hashes, or signatures…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter saved proofs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All local proofs</option>
            <option value="wallet">Connected wallet</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Hash</th>
                  <th>Recorded</th>
                  <th>Saved status</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.signature}>
                    <td>
                      <Link href={`/proof/${p.signature}`}>
                        <FileCheck2 size={18} />
                        {p.filename}
                      </Link>
                      <small>{short(p.signer)}</small>
                    </td>
                    <td>
                      <code>{short(p.hash)}</code>
                      <button
                        className="icon-button"
                        aria-label="Copy hash"
                        onClick={() => void copy(p.hash)}
                      >
                        <Copy size={13} />
                      </button>
                    </td>
                    <td>
                      {p.timestamp
                        ? new Date(p.timestamp * 1000).toLocaleDateString()
                        : "Unavailable"}
                    </td>
                    <td>
                      <span className="status-pill">Confirmed locally</span>
                    </td>
                    <td>
                      <a
                        href={explorer(p.signature)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {short(p.signature)} <ArrowUpRight size={14} />
                      </a>
                      <button
                        className="icon-button"
                        aria-label="Copy signature"
                        onClick={() => void copy(p.signature)}
                      >
                        <Copy size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty-icon">
              <FileCheck2 size={30} />
            </span>
            <h3>
              {history.length
                ? "No matching proofs"
                : "Your first proof starts here."}
            </h3>
            <p>
              {history.length
                ? "Try another search or filter."
                : "Register a document to build your private, browser-local activity history."}
            </p>
            <Button asChild className="secondary">
              <Link href="/register">
                Register a document <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        )}
      </div>
      <div className="quick-actions">
        <Link className="card" href="/verify">
          <ScanLine />
          <div>
            <h3>Have a proof to check?</h3>
            <p>Verify any PDF with a transaction signature.</p>
          </div>
          <ArrowUpRight />
        </Link>
        <div className="card local-warning">
          <Wallet />
          <div>
            <h3>Your history, on this device.</h3>
            <p>
              Clearing browser storage removes this list, not the blockchain
              proof. Keep your signatures and proof links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
