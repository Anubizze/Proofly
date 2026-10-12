import { DocumentFlow } from "@/components/document-flow";
export default function Verify() {
  return (
    <div className="workspace">
      <span className="kicker">DON’T ASSUME. VERIFY.</span>
      <h1>Verify a document</h1>
      <p className="page-description">
        Compare your PDF with a confirmed on-chain proof. No wallet required.
      </p>
      <DocumentFlow mode="verify" />
    </div>
  );
}
