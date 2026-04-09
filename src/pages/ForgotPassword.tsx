import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
      toast.success("If an account exists, a reset link has been sent.");
    }, 500);
  };

  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-sm">
          <h1 className="font-heading text-3xl font-extrabold text-center text-foreground">Forgot Password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>

          {sent ? (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">Check your email for a reset link.</p>
              <Link to="/login" className="mt-4 inline-block text-primary hover:underline text-sm">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="you@example.com" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Sending..." : "Send Reset Link"}</Button>
              <Link to="/login" className="text-center text-sm text-primary hover:underline">Back to Login</Link>
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default ForgotPassword;
