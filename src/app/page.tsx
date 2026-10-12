"use client";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  FileCheck2,
  Fingerprint,
  ShieldCheck,
  LockKeyhole,
  Globe2,
  Zap,
  GraduationCap,
  BriefcaseBusiness,
  Scale,
  Check,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="eyebrow">
            <span className="live-dot" /> A new standard for document trust{" "}
            <ArrowUpRight size={14} />
          </div>
          <h1>
            Trust every
            <br />
            document.
            <br />
            <span>Verify on-chain.</span>
          </h1>
          <p>
            A document can change. Its proof shouldn’t.
            <br />
            Register a private fingerprint on Solana and let anyone verify the
            original. No uploads. No middlemen.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/register">
                Register a document <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Button asChild className="secondary">
              <Link href="/verify">
                <ScanLine size={18} /> Verify a document
              </Link>
            </Button>
          </div>
          <div className="hero-notes">
            <span>
              <Check size={14} /> Files stay on your device
            </span>
            <span>
              <Check size={14} /> Wallet-free verification
            </span>
          </div>
        </motion.div>
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="visual-label">
            <span className="live-dot" /> THE DOCUMENT TRUST LAYER
          </div>
          <div className="document-art">
            <div className="art-top">
              <span className="pdf-icon">PDF</span>
              <span>
                YOUR DOCUMENT
                <br />
                <small>Private by design</small>
              </span>
              <LockKeyhole size={18} />
            </div>
            <div className="art-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-fingerprint">
              <Fingerprint size={56} />
              <div>
                SHA-256 fingerprint<small>Computed on your device</small>
              </div>
            </div>
            <div className="art-foot">
              <ShieldCheck size={18} /> Ready for independent verification
            </div>
          </div>
          <div className="chain-node">
            <span className="solana-mark">≋</span>
            <div>
              Solana<small>Immutable proof. Publicly verifiable.</small>
            </div>
            <ArrowUpRight size={20} />
          </div>
          <div className="visual-caption">
            DOCUMENT → FINGERPRINT → ON-CHAIN PROOF
          </div>
        </motion.div>
      </section>
      <section className="trust-strip">
        <span>
          PRIVATE FILES.
          <br />
          <strong>PUBLIC CONFIDENCE.</strong>
        </span>
        <div>
          <LockKeyhole /> Zero document uploads
        </div>
        <div>
          <Fingerprint /> SHA-256 integrity
        </div>
        <div>
          <Globe2 /> Independently verifiable
        </div>
        <div>
          <Zap /> Powered by Solana
        </div>
      </section>
      <section id="how-it-works" className="marketing-section">
        <div className="section-heading">
          <div>
            <span className="kicker">SIMPLE BY DESIGN</span>
            <h2>Three steps. One lasting proof.</h2>
          </div>
          <p>
            From your device to the blockchain.
            <br />
            Your document never makes the trip.
          </p>
        </div>
        <div className="steps">
          {[
            {
              icon: FileCheck2,
              title: "Choose your document",
              text: "Select a PDF. Your browser creates a unique SHA-256 fingerprint from its exact bytes.",
            },
            {
              icon: Fingerprint,
              title: "Anchor it on Solana",
              text: "Approve a Memo transaction with Phantom. The fingerprint and signing wallet become independently readable.",
            },
            {
              icon: ShieldCheck,
              title: "Verify with confidence",
              text: "Share your proof link. Anyone can compare their document with the confirmed on-chain fingerprint.",
            },
          ].map((s, i) => (
            <article className="card step" key={s.title}>
              <span className="step-number">0{i + 1}</span>
              <s.icon size={28} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="privacy-section">
        <div>
          <span className="kicker">PRIVACY IS THE FOUNDATION</span>
          <h2>
            Prove the document.
            <br />
            <span>Keep the document.</span>
          </h2>
          <p>
            There is no document storage, no private-key custody, and no
            database standing between you and your proof. Just a cryptographic
            fingerprint, anchored to Solana.
          </p>
          <Link href="/register">
            Create your first proof <ArrowRight size={17} />
          </Link>
        </div>
        <div className="privacy-list">
          {[
            {
              icon: LockKeyhole,
              title: "Local hashing. Always.",
              text: "PDF bytes stay in your browser. Only the hash is published.",
            },
            {
              icon: Globe2,
              title: "Open verification",
              text: "Read the proof directly from Devnet RPC. No account or wallet required.",
            },
            {
              icon: ShieldCheck,
              title: "Clear, honest results",
              text: "A hash match proves byte-for-byte integrity. It does not establish legal validity, truthfulness, or issuer identity.",
            },
          ].map((x) => (
            <div key={x.title}>
              <x.icon />
              <span>
                <strong>{x.title}</strong>
                <p>{x.text}</p>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="marketing-section">
        <span className="kicker">BUILT FOR REAL DOCUMENTS</span>
        <h2>Trust that travels with your work.</h2>
        <div className="steps use-cases">
          {[
            {
              icon: GraduationCap,
              title: "Education",
              text: "Let graduates and institutions compare certificates against a recorded version.",
            },
            {
              icon: BriefcaseBusiness,
              title: "Business",
              text: "Track whether reports, agreements, and deliverables match the shared original.",
            },
            {
              icon: Scale,
              title: "Legal documentation",
              text: "Record document integrity without publishing confidential contents.",
            },
          ].map((x) => (
            <article key={x.title} className="card">
              <x.icon />
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="cta-banner">
        <div>
          <span className="kicker">YOUR NEXT DOCUMENT, VERIFIED.</span>
          <h2>A little proof goes a long way.</h2>
          <p>Try Proofly on Solana Devnet. Test SOL has no monetary value.</p>
        </div>
        <Button asChild>
          <Link href="/register">
            Get started <ArrowUpRight size={18} />
          </Link>
        </Button>
      </section>
    </>
  );
}
