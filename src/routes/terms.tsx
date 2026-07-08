import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold">Terms & Privacy</h1>
      <p className="mt-2 text-muted-foreground">Your safety and privacy at Tender Pro.</p>
      <div className="glass-card mt-8 space-y-4 p-8 text-sm leading-relaxed">
        <p><strong>1. Data.</strong> We store your account details and generated documents securely so you can access them from any device.</p>
        <p><strong>2. Confidentiality.</strong> Your bid documents are used only to generate your proposals. We never share them with third parties.</p>
        <p><strong>3. AI Output.</strong> AI-generated content is a draft. You are responsible for reviewing and adapting proposals before submission.</p>
        <p><strong>4. Payments.</strong> Mobile-money payments are processed by PawaPay. Card payments are temporarily unavailable.</p>
        <p><strong>5. Subscriptions.</strong> Plans are billed monthly. Daily limits reset at midnight.</p>
        <p><strong>6. Account.</strong> You may delete your account at any time. On deletion, your files are purged from our storage.</p>
        <p><strong>7. Support.</strong> Contact us on WhatsApp at +260 768 210 506.</p>
      </div>
      <Link to="/auth" search={{ mode: "signup" }} className="mt-8 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
        Back to Sign Up
      </Link>
    </div>
  );
}
