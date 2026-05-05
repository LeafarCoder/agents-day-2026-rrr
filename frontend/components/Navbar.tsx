'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { API_URL, apiFetch } from "@/lib/api";
import { useIsMobile } from "@/lib/useIsMobile";

const NAV_LINKS = [
  { href: "/",           label: "Profile" },
  { href: "/email-scan", label: "Scan"    },
  { href: "/results",    label: "Results" },
  { href: "/trips",      label: "Trips"   },
  { href: "/account",    label: "Account" },
] as const;

export default function Navbar() {
  const [isDemo, setIsDemo] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  useEffect(() => {
    apiFetch(`${API_URL}/api/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.demo) setIsDemo(true);
        setIsConnected(d?.connected ?? false);
      })
      .catch(() => { setIsConnected(false); })
  }, []);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock/restore body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const brand = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
      {isDemo && (
        <span style={{
          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#040b18",
          background: "var(--text-accent)", borderRadius: "var(--radius-sm)",
          padding: "0.15rem 0.5rem",
        }}>
          Demo
        </span>
      )}
    </div>
  );

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
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
          {brand}

          {isMobile ? (
            /* ── Hamburger button (mobile) — always show for all users ── */
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
              aria-expanded={open}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                padding: 0,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--text)",
                transition: "background 150ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              {open ? (
                /* ✕ close icon */
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              ) : (
                /* ☰ hamburger icon */
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          ) : isConnected === false ? (
            /* ── Desktop unauthenticated: only Sign In + theme toggle ── */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a
                href={`${API_URL}/auth`}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-accent)",
                  border: "1px solid var(--border-accent)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In →
              </a>
              <ThemeToggle />
            </div>
          ) : (
            /* ── Desktop nav links ── */
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  data-tour={href === '/account' ? 'nav-account' : undefined}
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

              {(isDemo || !isConnected) && (
                <>
                  <div style={{ width: "1px", height: 18, background: "var(--border)", margin: "0 0.25rem" }} aria-hidden="true" />
                  <a
                    href={`${API_URL}/auth`}
                    style={{
                      padding: "0.35rem 0.8rem",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--text-accent)",
                      border: "1px solid var(--border-accent)",
                      textDecoration: "none",
                      transition: "background 180ms ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(0,212,170,0.08)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    Sign In →
                  </a>
                </>
              )}

              <div style={{ width: "1px", height: 18, background: "var(--border)", margin: "0 0.4rem" }} aria-hidden="true" />
              <ThemeToggle />
            </div>
          )}
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      {isMobile && open && (
        <div
          role="dialog"
          aria-label="Navigation menu"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            background: "var(--nav-surface)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
          }}
        >
          {/* Drawer header — mirrors navbar */}
          <div style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            borderBottom: "1px solid var(--nav-border)",
            flexShrink: 0,
          }}>
            {brand}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: "var(--radius-md)",
                color: "var(--text-muted)",
                fontSize: "1.4rem",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Drawer nav links */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                data-tour={href === '/account' ? 'nav-account' : undefined}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "0.875rem 1rem",
                  marginBottom: "0.25rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "1.05rem",
                  fontWeight: 500,
                  color: pathname === href ? "var(--text-accent)" : "var(--text)",
                  background: pathname === href ? "rgba(0,212,170,0.07)" : "transparent",
                  textDecoration: "none",
                  border: "1px solid",
                  borderColor: pathname === href ? "rgba(0,212,170,0.18)" : "transparent",
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </Link>
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "1rem 0" }} />

            {/* Theme toggle row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 1rem",
            }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Theme</span>
              <ThemeToggle />
            </div>

            {/* Sign-in CTA for unauthenticated and demo users */}
            {(isDemo || isConnected === false) && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "1rem 0" }} />
                <a
                  href={`${API_URL}/auth`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "0.875rem 1rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--text-accent)",
                    border: "1px solid var(--border-accent)",
                    textDecoration: "none",
                  }}
                >
                  Sign In →
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
