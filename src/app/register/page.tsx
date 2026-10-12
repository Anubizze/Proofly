import { DocumentFlow } from "@/components/document-flow";
export default function Register() {
  return (
    <div className="workspace">
      <span className="kicker">YOUR DOCUMENT. YOUR PROOF.</span>
      <h1>Register a document</h1>
      <p className="page-description">
        Anchor your document’s fingerprint on Solana. Keep the original private.
      </p>
      <DocumentFlow mode="register" />
    </div>
  );
}
