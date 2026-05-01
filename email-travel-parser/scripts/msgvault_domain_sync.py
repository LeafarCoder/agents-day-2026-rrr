from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from typing import Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from detection.config import TRAVEL_DOMAINS


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, capture_output=True, check=True)


def _run_json(*args: str) -> Any:
    return json.loads(_run(*args).stdout)


def _normalize_domain(value: str) -> str:
    value = value.strip().lower()
    if value.startswith("www."):
        value = value[4:]
    return value


def _domain_allowed(domain: str, allowed: set[str]) -> bool:
    return any(domain == base or domain.endswith(f".{base}") for base in allowed)


def _build_domain_query(domains: list[str]) -> str:
    clauses = [f"from:{domain}" for domain in sorted(set(domains))]
    if not clauses:
        raise ValueError("No provider domains selected.")
    return "(" + " OR ".join(clauses) + ")"


def discovered_domains() -> list[str]:
    rows = _run_json("msgvault", "list-domains", "--limit", "500", "--json")
    return [_normalize_domain(row["key"]) for row in rows if row.get("key")]


def candidate_provider_domains(use_discovered_only: bool) -> list[str]:
    discovered = discovered_domains()
    allowed = {_normalize_domain(d) for d in TRAVEL_DOMAINS}
    if use_discovered_only:
        return [d for d in discovered if _domain_allowed(d, allowed)]
    merged = set(allowed)
    for domain in discovered:
        if _domain_allowed(domain, allowed):
            merged.add(domain)
    return sorted(merged)


def print_domain_report() -> None:
    discovered = discovered_domains()
    allowed = {_normalize_domain(d) for d in TRAVEL_DOMAINS}

    providers = sorted([d for d in discovered if _domain_allowed(d, allowed)])
    excluded = sorted([d for d in discovered if not _domain_allowed(d, allowed)])

    print("Discovered domains in local msgvault archive:")
    for domain in discovered:
        print(f"  - {domain}")
    print("\nProvider domains matched by registry:")
    for domain in providers:
        print(f"  - {domain}")
    print("\nExcluded (non-provider/private) domains:")
    for domain in excluded:
        print(f"  - {domain}")


def sync_filtered(
    account: str,
    use_discovered_only: bool,
    limit: int | None,
    after: str | None,
    before: str | None,
    noresume: bool,
) -> None:
    domains = candidate_provider_domains(use_discovered_only)
    query = _build_domain_query(domains)

    cmd = ["msgvault", "sync-full", account, "--query", query]
    if limit is not None:
        cmd.extend(["--limit", str(limit)])
    if after:
        cmd.extend(["--after", after])
    if before:
        cmd.extend(["--before", before])
    if noresume:
        cmd.append("--noresume")

    print("Using domain-filtered msgvault query:")
    print(f"  {query}")
    print("\nRunning:")
    print("  " + " ".join(shlex.quote(part) for part in cmd))
    subprocess.run(cmd, check=True)


def print_mcp_hint() -> None:
    print("\nMCP server command (for any LLM client with MCP support):")
    print("  msgvault mcp")
    print("\nHybrid semantic search example:")
    print(
        "  msgvault search "
        "\"cooking classes wine tasting architecture walk\" "
        "--mode hybrid --json --limit 8 --explain"
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Domain-filtered msgvault sync and discovery for travel demo."
    )
    parser.add_argument("--account", help="Gmail account for msgvault sync-full.")
    parser.add_argument(
        "--discovered-only",
        action="store_true",
        help="Sync only domains already discovered in local archive (and matched).",
    )
    parser.add_argument("--limit", type=int, default=None, help="Optional sync limit.")
    parser.add_argument("--after", default=None, help="Optional YYYY-MM-DD lower bound.")
    parser.add_argument("--before", default=None, help="Optional YYYY-MM-DD upper bound.")
    parser.add_argument(
        "--noresume",
        action="store_true",
        help="Force a fresh full sync without resume checkpoints.",
    )
    parser.add_argument(
        "--report-only",
        action="store_true",
        help="Print discovered domains and matched provider domains without syncing.",
    )
    args = parser.parse_args()

    try:
        print_domain_report()
        if not args.report_only:
            if not args.account:
                raise ValueError("--account is required unless --report-only is used.")
            sync_filtered(
                account=args.account,
                use_discovered_only=args.discovered_only,
                limit=args.limit,
                after=args.after,
                before=args.before,
                noresume=args.noresume,
            )
        print_mcp_hint()
        return 0
    except subprocess.CalledProcessError as exc:
        sys.stderr.write(exc.stderr)
        return exc.returncode
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"{exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
