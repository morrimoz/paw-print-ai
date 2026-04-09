import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("If an account exists, a reset link has been sent.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
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
