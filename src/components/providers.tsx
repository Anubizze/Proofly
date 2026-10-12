"use client";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "./ui/button";
import { short, friendlyError } from "@/lib/proof";
export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider
      endpoint={
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com"
      }
    >
      <WalletProvider
        wallets={wallets}
        onError={(e) => toast.error(friendlyError(e))}
      >
        {children}
        <Toaster theme="dark" richColors position="bottom-right" />
      </WalletProvider>
    </ConnectionProvider>
  );
}
export function WalletButton() {
  const {
    wallets,
    wallet,
    select,
    connect,
    disconnect,
    connected,
    connecting,
    publicKey,
  } = useWallet();
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (requested && wallet) {
      void connect()
        .catch((e) => toast.error(friendlyError(e)))
        .finally(() => setRequested(false));
    }
  }, [requested, wallet, connect]);
  return (
    <Button
      className="wallet-button"
      disabled={connecting}
      onClick={() => {
        if (connected) {
          void disconnect().catch((e) => toast.error(friendlyError(e)));
          return;
        }
        const phantom = wallets.find((w) => w.adapter.name === "Phantom");
        if (!phantom) {
          toast.error(
            "Phantom was not detected. Install the extension or open this site in the Phantom browser.",
          );
          return;
        }
        if (wallet?.adapter.name === "Phantom")
          void connect().catch((e) => toast.error(friendlyError(e)));
        else {
          select(phantom.adapter.name);
          setRequested(true);
        }
      }}
    >
      {connecting
        ? "Connecting…"
        : connected
          ? `${short(publicKey!.toBase58())} · Disconnect`
          : "Connect wallet"}
    </Button>
  );
}
