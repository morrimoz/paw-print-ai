import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-lg">
          <h1 className="font-heading text-4xl font-extrabold text-center text-foreground">Contact Us</h1>
          <p className="mt-3 text-center text-muted-foreground">
            Questions? Feedback? We'd love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="How can we help?"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" /> support@pawprintai.com
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
