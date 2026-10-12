import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="workspace">
      <span className="kicker">404 · PAGE NOT FOUND</span>
      <h1>This page isn’t here.</h1>
      <p className="page-description">
        To find a document proof, enter its Solana transaction signature on the
        verification page.
      </p>
      <Button asChild>
        <Link href="/verify">Verify a document</Link>
      </Button>
    </div>
  );
}
