import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Password updated! You can now log in.");
      setLoading(false);
    }, 500);
  };

  return (
    <PublicLayout>
      <section className="py-16 md:py-24">
        <div className="container max-w-sm">
          <h1 className="font-heading text-3xl font-extrabold text-center text-foreground">Reset Password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">New Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Updating..." : "Update Password"}</Button>
            <Link to="/login" className="text-center text-sm text-primary hover:underline">Back to Login</Link>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
};

export default ResetPassword;
