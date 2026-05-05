'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { API_URL, apiFetch } from "@/lib/api";
import { DEMO_AUTH_EVENT, DEMO_AUTH_PENDING_KEY, SESSION_MODE_KEY, exchangeAuthTokensIfPresent } from "@/lib/auth";
import { useIsMobile } from "@/lib/useIsMobile";

// Three primary destination views
const NAV_LINKS = [
  { href: "/",        label: "Profile" },
  { href: "/trips",   label: "Trips"   },
  { href: "/results", label: "Emails"  },
] as const;

export default function Navbar() {
  const [isDemo, setIsDemo] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let retry: number | undefined;

    async function loadSession(attempt = 0) {
      try {
        const params = new URL(window.location.href).searchParams;
        const hasTokenInUrl = params.has('demo_token') || params.has('auth_token');
        const isDemoPending = localStorage.getItem(DEMO_AUTH_PENDING_KEY) === '1';
        const hasStoredToken = !!localStorage.getItem('session_token');
        const isStoredDemo = localStorage.getItem(SESSION_MODE_KEY) === 'demo';
        if (hasTokenInUrl || isDemoPending || hasStoredToken) {
          setIsConnected(true);
        }
        if (hasTokenInUrl || isDemoPending || isStoredDemo) {
          setIsDemo(true);
        }
      } catch {}

      await exchangeAuthTokensIfPresent();

      try {
        const r = await apiFetch(`${API_URL}/api/me`, { credentials: "include" });
        const d = r.ok ? await r.json() : null;
        if (cancelled) return;

        if (d?.connected) {
          setIsDemo(d?.demo ?? false);
          setIsConnected(true);
          setDisplayName(d?.display_name ?? null);
          return;
        }

        const shouldRetry = (() => {
          try {
            return localStorage.getItem(DEMO_AUTH_PENDING_KEY) === '1' || !!localStorage.getItem('session_token');
          } catch {
            return false;
          }
        })();

        if (shouldRetry && attempt < 10) {
          retry = window.setTimeout(() => loadSession(attempt + 1), 200);
          return;
        }

        setIsDemo(false);
        setIsConnected(false);
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    }
    loadSession();

    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ connected?: boolean; demo?: boolean }>).detail;
      if (detail?.connected) setIsConnected(true);
      if (typeof detail?.demo === 'boolean') setIsDemo(detail.demo);
      loadSession();
    };
    window.addEventListener(DEMO_AUTH_EVENT, onAuthChanged);
    return () => {
      cancelled = true;
      if (retry) window.clearTimeout(retry);
      window.removeEventListener(DEMO_AUTH_EVENT, onAuthChanged);
    };
  }, []);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock/restore body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close drawer on Escape
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
            /* ── Hamburger (mobile) ── */
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
              aria-expanded={open}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36, height: 36,
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
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          ) : isConnected === false ? (
            /* ── Desktop unauthenticated: Sign In + theme toggle only ── */
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
            /* ── Desktop: 3 destination links + Scan CTA + avatar menu ── */
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <NavLink key={href} href={href} label={label} isActive={pathname === href} />
              ))}

              <div style={{ width: "1px", height: 18, background: "var(--border)", margin: "0 0.25rem" }} aria-hidden="true" />

              <Link
                href="/email-scan"
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-accent)",
                  border: "1px solid var(--border-accent)",
                  textDecoration: "none",
                  transition: "background 180ms ease",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(0,212,170,0.08)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                + Scan
              </Link>

              {isDemo && (
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

              <div style={{ width: "1px", height: 18, background: "var(--border)", margin: "0 0.25rem" }} aria-hidden="true" />
              <UserMenu displayName={displayName} isDemo={isDemo} />
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
                width: 36, height: 36,
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

          <nav style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
            {/* Primary destinations */}
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
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

            {/* Scan CTA */}
            <Link
              href="/email-scan"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.875rem 1rem",
                marginBottom: "0.25rem",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--text-accent)",
                background: pathname === '/email-scan' ? "rgba(0,212,170,0.07)" : "transparent",
                textDecoration: "none",
                border: "1px solid var(--border-accent)",
                letterSpacing: "0.01em",
              }}
            >
              + Scan
            </Link>

            <div style={{ height: 1, background: "var(--border)", margin: "1rem 0" }} />

            {/* Settings links */}
            {([
              { href: '/account', label: 'Account' },
              { href: '/categories', label: 'Categories' },
            ] as const).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
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

            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Theme</span>
              <ThemeToggle />
            </div>

            {/* Demo: Sign In CTA */}
            {isDemo && (
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

            {/* Log out (connected non-demo only) */}
            {isConnected === true && !isDemo && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "1rem 0" }} />
                <button
                  onClick={async () => {
                    try { await apiFetch(`${API_URL}/disconnect`, { method: 'GET' }) } catch {}
                    try { localStorage.removeItem('session_token') } catch {}
                    try { localStorage.removeItem(SESSION_MODE_KEY) } catch {}
                    window.location.href = '/'
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "0.875rem 1rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: '#f87171',
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                  }}
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      style={{
        padding: "0.375rem 0.75rem",
        borderRadius: "var(--radius-md)",
        fontSize: "0.82rem",
        fontWeight: 500,
        color: isActive ? "var(--text-accent)" : (hovered ? "var(--text)" : "var(--text-muted)"),
        background: isActive ? "rgba(0,212,170,0.07)" : (hovered ? "rgba(255,255,255,0.05)" : "transparent"),
        textDecoration: "none",
        transition: "color 180ms ease, background 180ms ease",
        letterSpacing: "0.02em",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  )
}
