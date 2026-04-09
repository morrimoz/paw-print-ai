import { Link } from "react-router-dom";

const footerLinks = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-of-service" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-neutral-900 text-neutral-300">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="PawPrint AI" className="h-7 w-auto brightness-200" />
              <span className="font-heading text-lg font-extrabold text-neutral-100">PawPrint AI</span>
            </div>
            <p className="text-sm text-neutral-700 max-w-xs">
              Instant Art, Lasting Memories. Transform your pet photos into unique AI art.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-neutral-700 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-700">
          © {new Date().getFullYear()} PawPrint AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
