'use client'

/**
 * Glass morphism top navigation bar.
 * Static — brand logo + route links. Auth state lives in page content.
 */
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "60px",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
        background: "var(--nav-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--nav-border)",
        transition: "background 300ms ease",
      }}
    >
      <nav
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            fontWeight: 600,
            color: "var(--text)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            letterSpacing: "0.01em",
          }}
        >
          <span style={{ color: "var(--text-accent)", fontSize: "1.1rem" }}>✦</span>
          Travel DNA
        </Link>

        {/* Nav links + theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {[
            { href: "/",             label: "Profile"     },
            { href: "/email-scan",   label: "Scan"        },
            { href: "/scan",         label: "Results"     },
            { href: "/preferences",  label: "Categories"  },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "color 180ms ease, background 180ms ease",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ width: "1px", height: 18, background: "var(--border)", margin: "0 0.4rem" }} aria-hidden="true" />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
