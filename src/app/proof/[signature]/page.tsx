import { DocumentFlow } from "@/components/document-flow";
export default async function PublicProof({
  params,
}: {
  params: Promise<{ signature: string }>;
}) {
  const { signature } = await params;
  return (
    <div className="workspace">
      <span className="kicker">OPEN & INDEPENDENTLY VERIFIABLE</span>
      <h1>Public document proof</h1>
      <p className="page-description">
        Live proof details from Solana Devnet. Upload a PDF to compare its
        fingerprint.
      </p>
      <DocumentFlow key={signature} mode="proof" initialSignature={signature} />
    </div>
  );
}
