import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { label: "How it Works", to: "/how-it-works" },
  { label: "Gallery", to: "/gallery" },
  { label: "Pricing", to: "/pricing" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="PawPrint AI" className="h-8 w-auto" />
          <span className="font-heading text-xl font-extrabold text-foreground">PawPrint AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{profile?.credits_balance ?? 0} treats</span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/create-art">Create Art</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/my-profile"><User className="h-4 w-4" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 animate-fade-in">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`py-2 text-sm font-medium ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`} onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/create-art" className="py-2 text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Create Art</Link>
                <Link to="/my-orders" className="py-2 text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>My Orders</Link>
                <Link to="/my-treats" className="py-2 text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>My Treats</Link>
                <Link to="/my-profile" className="py-2 text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>My Profile</Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="py-2 text-sm text-destructive text-left">Sign Out</button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" asChild className="flex-1"><Link to="/login" onClick={() => setMobileOpen(false)}>Log In</Link></Button>
                <Button size="sm" asChild className="flex-1"><Link to="/signup" onClick={() => setMobileOpen(false)}>Sign Up</Link></Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
