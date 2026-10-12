"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  FilePlus2,
  ScanLine,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
import { WalletButton } from "./providers";
const items = [
  { href: "/dashboard", text: "Overview", icon: LayoutDashboard },
  { href: "/register", text: "Register document", icon: FilePlus2 },
  { href: "/verify", text: "Verify document", icon: ScanLine },
];
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span>
        <ShieldCheck size={22} />
      </span>
      proofly<span className="logo-dot">.</span>
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className={path === "/" ? "site landing" : "site app-shell"}>
      {path !== "/" && (
        <aside className="sidebar">
          <Logo />
          <div className="nav-caption">WORKSPACE</div>
          <nav>
            {items.map(({ href, text, icon: Icon }) => (
              <Link
                className={path === href ? "active" : ""}
                key={href}
                href={href}
              >
                <Icon size={19} />
                {text}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="privacy-card">
              <LockKeyhole size={22} />
              <strong>Your files stay yours.</strong>
              <p>
                Only a fingerprint goes on-chain. Your documents never leave
                your browser.
              </p>
            </div>
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noreferrer"
            >
              Get Devnet SOL <ArrowUpRight size={15} />
            </a>
            <span className="network">
              <i /> Solana Devnet · Test network
            </span>
          </div>
        </aside>
      )}
      <div className="main-shell">
        <header className="topbar">
          {path === "/" ? (
            <Logo />
          ) : (
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              {items.find((i) => i.href === path)?.text || "Public proof"}
            </span>
          )}
          {path === "/" && (
            <nav className="landing-nav">
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/verify">Verify a document</Link>
              <Link href="/dashboard">Dashboard</Link>
            </nav>
          )}
          <div className="topbar-right">
            <span className="network">
              <i /> Devnet
            </span>
            <WalletButton />
          </div>
        </header>
        {path !== "/" && (
          <nav className="mobile-nav">
            {items.map((i) => (
              <Link
                key={i.href}
                className={path === i.href ? "active" : ""}
                href={i.href}
              >
                {i.text}
              </Link>
            ))}
          </nav>
        )}
        <main>{children}</main>
        <footer>
          <span>© {new Date().getFullYear()} Proofly · Built on Solana</span>
          <div>
            {process.env.NEXT_PUBLIC_GITHUB_URL && (
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            )}
            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noreferrer"
            >
              Solana Explorer ↗
            </a>
            <span>Integrity, independently verified.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
