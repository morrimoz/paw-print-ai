import { PublicLayout } from "@/components/PublicLayout";

const PrivacyPolicy = () => (
  <PublicLayout>
    <section className="py-16 md:py-24">
      <div className="container max-w-3xl prose prose-neutral">
        <h1 className="font-heading text-4xl font-extrabold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Data Collection</h2>
        <p className="text-muted-foreground">We collect your email address and name when you create an account. Pet photos you upload are processed by our AI and stored securely in your account.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">How We Use Your Data</h2>
        <p className="text-muted-foreground">Your data is used to provide AI art generation services, process orders, and communicate important account updates. We never sell your personal data to third parties.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Data Storage & Security</h2>
        <p className="text-muted-foreground">All data is stored securely with encryption at rest and in transit. Pet photos and generated artwork are stored privately and accessible only to your account.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Your Rights</h2>
        <p className="text-muted-foreground">You can request deletion of your account and all associated data at any time by contacting support@pawprintai.com.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Contact</h2>
        <p className="text-muted-foreground">For privacy-related questions, email us at support@pawprintai.com.</p>
      </div>
    </section>
  </PublicLayout>
);

export default PrivacyPolicy;
