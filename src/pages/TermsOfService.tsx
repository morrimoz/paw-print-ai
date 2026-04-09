import { PublicLayout } from "@/components/PublicLayout";

const TermsOfService = () => (
  <PublicLayout>
    <section className="py-16 md:py-24">
      <div className="container max-w-3xl prose prose-neutral">
        <h1 className="font-heading text-4xl font-extrabold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: April 2026</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">User Obligations</h2>
        <p className="text-muted-foreground">By using PawPrint AI, you agree to upload only photos you own or have the right to use. You must not use the service for any illegal or harmful purposes.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Intellectual Property</h2>
        <p className="text-muted-foreground">You retain ownership of photos you upload. AI-generated artwork is licensed to you for personal and commercial use once generated with purchased credits.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Credits & Payments</h2>
        <p className="text-muted-foreground">Credits are non-refundable and do not expire. Merchandise orders are fulfilled by our print partner and are subject to their production timelines.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Disclaimers</h2>
        <p className="text-muted-foreground">AI-generated art results may vary. We do not guarantee specific outcomes. The service is provided "as is" without warranties of any kind.</p>

        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Contact</h2>
        <p className="text-muted-foreground">Questions about these terms? Email support@pawprintai.com.</p>
      </div>
    </section>
  </PublicLayout>
);

export default TermsOfService;
