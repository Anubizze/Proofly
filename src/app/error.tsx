"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="workspace">
      <span className="kicker">LET’S TRY AGAIN</span>
      <h1>This page could not load.</h1>
      <p className="page-description">
        Keep any submitted transaction signature. You can inspect its status on
        the public proof page.
      </p>
      <Button onClick={reset}>Retry page</Button>
    </div>
  );
}
