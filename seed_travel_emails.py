from __future__ import annotations

import argparse
import base64
import os
import wsgiref.simple_server
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid
from urllib.parse import urlsplit

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build


SCOPES = [
    "https://www.googleapis.com/auth/gmail.insert",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "seed_token.json"
TO_ADDRESS = "email.travel.parser@gmail.com"
REDIRECT_URI = "http://localhost:5000/oauth/callback"

# Local OAuth callback for hackathon/dev seeding only.
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")


TEST_EMAILS = [
    {
        "date": "2026-01-08T09:15:00+00:00",
        "sender": "Booking.com <confirmations@booking.com>",
        "subject": "Your stay in Lisbon is confirmed - Booking.com",
        "body": """Your stay in Lisbon is confirmed.

Hotel: Bairro Alto Suites
Check-in: January 16, 2026
Check-out: January 20, 2026

This hotel reservation includes a walking tour, restaurant dinner, and museum tickets.
Booking reference: BK-LIS-10492
""",
    },
    {
        "date": "2026-01-11T13:25:00+00:00",
        "sender": "easyJet <bookings@easyjet.com>",
        "subject": "Your flight to Lisbon is confirmed | easyJet",
        "body": """Your flight to Lisbon is confirmed.

Flight: EZY 8142
Departure: London Gatwick
Arrival: Lisbon
Travel date: January 16, 2026

Your e-ticket and boarding details are ready.
""",
    },
    {
        "date": "2026-01-18T18:40:00+00:00",
        "sender": "GetYourGuide <tickets@getyourguide.com>",
        "subject": "Your trip to Lisbon is confirmed - Food tour and sunset cruise",
        "body": """Your trip to Lisbon is confirmed.

Activities booked:
- Alfama food tour
- Sunset cruise on the Tagus
- Historical walking tour

Order confirmation: GYG-LIS-9931
""",
    },
    {
        "date": "2026-02-02T08:20:00+00:00",
        "sender": "Airbnb <automated@airbnb.com>",
        "subject": "Your Airbnb in Barcelona is confirmed",
        "body": """Your airbnb in Barcelona is confirmed.

Apartment rental near El Born
Check-in: February 12, 2026
Check-out: February 16, 2026

The host recommends tapas restaurants, art tour options, and a cycling tour.
""",
    },
    {
        "date": "2026-02-04T10:05:00+00:00",
        "sender": "Vueling <booking@vueling.com>",
        "subject": "Your flight to Barcelona is confirmed - Vueling",
        "body": """Your flight to Barcelona is confirmed.

Flight: VY 8461
Departure: Lisbon
Arrival: Barcelona
Travel date: February 12, 2026

This itinerary includes one checked bag.
""",
    },
    {
        "date": "2026-02-13T17:35:00+00:00",
        "sender": "Viator <confirmation@viator.com>",
        "subject": "Your booking in Barcelona is confirmed - Gothic Quarter walking tour",
        "body": """Your booking in Barcelona is confirmed.

Experience: Gothic Quarter walking tour and architecture visit
Date: February 14, 2026

This cultural tour includes heritage sites, art tour stops, and local tasting.
""",
    },
    {
        "date": "2026-02-22T12:10:00+00:00",
        "sender": "Marriott <reservations@marriott.com>",
        "subject": "Your hotel reservation in Paris is confirmed",
        "body": """Your hotel reservation in Paris is confirmed.

Hotel: Courtyard Paris Gare de Lyon
Check-in: March 5, 2026
Check-out: March 9, 2026

Your hotel receipt will be available after checkout.
""",
    },
    {
        "date": "2026-02-25T15:00:00+00:00",
        "sender": "Transavia <booking@transavia.com>",
        "subject": "Your flight to Paris is confirmed - e-ticket enclosed",
        "body": """Your flight to Paris is confirmed.

Flight: TO 7647
Departure: Porto
Arrival: Paris Orly
Travel date: March 5, 2026

Your e-ticket and check-in details are attached.
""",
    },
    {
        "date": "2026-03-06T09:45:00+00:00",
        "sender": "GetYourGuide <tickets@getyourguide.com>",
        "subject": "Your trip to Paris is confirmed - Louvre museum and wine tasting",
        "body": """Your trip to Paris is confirmed.

Activities:
- Louvre museum entry
- Montmartre walking tour
- French wine tasting

This sightseeing booking is confirmed.
""",
    },
    {
        "date": "2026-03-14T11:30:00+00:00",
        "sender": "Hilton <reservations@hilton.com>",
        "subject": "Your stay in Rome is confirmed - Hilton",
        "body": """Your stay in Rome is confirmed.

Hotel: Aleph Rome Hotel
Check-in: March 24, 2026
Check-out: March 28, 2026

Nearby options include old town sightseeing, restaurant dinner, and historical tours.
""",
    },
    {
        "date": "2026-03-16T16:20:00+00:00",
        "sender": "Ryanair <itinerary@ryanair.com>",
        "subject": "Your flight to Rome is confirmed - Ryanair itinerary",
        "body": """Your flight to Rome is confirmed.

Flight: FR 2098
Departure: Lisbon
Arrival: Rome Ciampino
Travel date: March 24, 2026

Your itinerary and boarding information are ready.
""",
    },
    {
        "date": "2026-03-25T19:50:00+00:00",
        "sender": "Viator <confirmation@viator.com>",
        "subject": "Your booking in Rome is confirmed - Colosseum historical tour",
        "body": """Your booking in Rome is confirmed.

Experience: Colosseum historical walking tour
Date: March 26, 2026

This cultural experience includes museum access, heritage sites, and local dinner tips.
""",
    },
    {
        "date": "2026-03-30T07:55:00+00:00",
        "sender": "Expedia <travel@expedia.com>",
        "subject": "Your trip to Amsterdam is confirmed - hotel and flight receipt",
        "body": """Your trip to Amsterdam is confirmed.

Package: hotel and flight
Travel dates: April 8-12, 2026

Includes canal boat tour, museum entry, cycling tour, and restaurant recommendations.
""",
    },
    {
        "date": "2026-04-02T10:15:00+00:00",
        "sender": "KLM via Expedia <travel@expedia.com>",
        "subject": "Your flight to Amsterdam is confirmed",
        "body": """Your flight to Amsterdam is confirmed.

Flight: KL 1580
Departure: Lisbon
Arrival: Amsterdam
Travel date: April 8, 2026

Your e-ticket has been issued.
""",
    },
    {
        "date": "2026-04-09T14:05:00+00:00",
        "sender": "Klook <confirmation@klook.com>",
        "subject": "Your booking in Amsterdam is confirmed - canal boat tour",
        "body": """Your booking in Amsterdam is confirmed.

Activities:
- Canal boat tour
- Rijksmuseum entry
- Food tasting walk

Order confirmation: KLK-AMS-2207
""",
    },
    {
        "date": "2026-04-12T08:45:00+00:00",
        "sender": "Hotels.com <confirmation@hotels.com>",
        "subject": "Your hotel in Berlin is confirmed - Hotels.com",
        "body": """Your hotel in Berlin is confirmed.

Hotel: Mitte Design Hotel
Check-in: April 19, 2026
Check-out: April 23, 2026

Your reservation details include breakfast and spa access.
""",
    },
    {
        "date": "2026-04-14T20:10:00+00:00",
        "sender": "easyJet <bookings@easyjet.com>",
        "subject": "Your flight to Berlin is confirmed | easyJet",
        "body": """Your flight to Berlin is confirmed.

Flight: EZY 7310
Departure: Paris
Arrival: Berlin Brandenburg
Travel date: April 19, 2026

Your boarding details and receipt are ready.
""",
    },
    {
        "date": "2026-04-20T13:35:00+00:00",
        "sender": "GetYourGuide <tickets@getyourguide.com>",
        "subject": "Your trip to Berlin is confirmed - museum island and nightlife tour",
        "body": """Your trip to Berlin is confirmed.

Activities:
- Museum Island sightseeing
- Street art tour
- Nightlife tour and rooftop bar

This order confirmation includes all tickets.
""",
    },
    {
        "date": "2026-04-21T09:25:00+00:00",
        "sender": "Agoda <booking@agoda.com>",
        "subject": "Your reservation in Prague is confirmed - Agoda",
        "body": """Your reservation in Prague is confirmed.

Hotel: Old Town Riverside Hotel
Check-in: April 24, 2026
Check-out: April 27, 2026

Nearby experiences include old town walking tour, restaurant dinner, and beer tasting.
""",
    },
    {
        "date": "2026-04-22T16:00:00+00:00",
        "sender": "Eurostar <tickets@eurostar.com>",
        "subject": "Your trip to Prague is confirmed - rail itinerary",
        "body": """Your trip to Prague is confirmed.

Rail itinerary via Berlin
Travel date: April 24, 2026

Your e-ticket and seat reservation are included.
""",
    },
    {
        "date": "2026-04-24T18:15:00+00:00",
        "sender": "Tripadvisor <bookings@tripadvisor.com>",
        "subject": "Your booking in Prague is confirmed - food tour",
        "body": """Your booking in Prague is confirmed.

Experience: Old Town food tour
Date: April 25, 2026

This culinary tour includes local tasting, restaurant stops, and cultural history.
""",
    },
    {
        "date": "2026-04-25T07:40:00+00:00",
        "sender": "Airbnb <automated@airbnb.com>",
        "subject": "Your Airbnb in Copenhagen is confirmed",
        "body": """Your airbnb in Copenhagen is confirmed.

Apartment rental near Nyhavn
Check-in: April 28, 2026
Check-out: May 1, 2026

The host recommends cycling tour routes, restaurant dinner, and boat tour options.
""",
    },
    {
        "date": "2026-04-26T11:05:00+00:00",
        "sender": "Norwegian <booking@norwegian.com>",
        "subject": "Your flight to Copenhagen is confirmed - Norwegian",
        "body": """Your flight to Copenhagen is confirmed.

Flight: DY 1784
Departure: Berlin
Arrival: Copenhagen
Travel date: April 28, 2026

Your itinerary, receipt, and check-in details are ready.
""",
    },
    {
        "date": "2026-04-28T15:45:00+00:00",
        "sender": "GetYourGuide <tickets@getyourguide.com>",
        "subject": "Your booking in Copenhagen is confirmed - bike tour and food tasting",
        "body": """Your booking in Copenhagen is confirmed.

Activities:
- Cycling tour
- Food tasting
- Architecture walking tour
- Canal boat tour

Confirmation number: GYG-CPH-6410
""",
    },
    {
        "date": "2026-04-30T12:30:00+00:00",
        "sender": "Booking.com <confirmations@booking.com>",
        "subject": "Your stay in Porto is confirmed - Booking.com",
        "body": """Your stay in Porto is confirmed.

Hotel: Ribeira Boutique Hotel
Check-in: May 2, 2026
Check-out: May 5, 2026

Your booking includes wine tour recommendations, sunset cruise options, and spa access.
""",
    },
]


def load_credentials(credentials_file: str, token_file: str, redirect_uri: str) -> Credentials:
    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    if not creds or not creds.valid:
        if not os.path.exists(credentials_file):
            raise FileNotFoundError(f"{credentials_file} not found")
        creds = run_registered_web_flow(credentials_file, redirect_uri)

    with open(token_file, "w", encoding="utf-8") as token:
        token.write(creds.to_json())
    return creds


def run_registered_web_flow(credentials_file: str, redirect_uri: str) -> Credentials:
    parsed_redirect = urlsplit(redirect_uri)
    if not parsed_redirect.hostname or not parsed_redirect.port:
        raise ValueError(
            "Redirect URI must include hostname and port, like http://localhost:5000/oauth/callback"
        )

    flow = Flow.from_client_secrets_file(
        credentials_file,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    response_url = None

    def app(environ, start_response):
        nonlocal response_url
        request_uri = environ.get("RAW_URI") or environ.get("REQUEST_URI")
        if not request_uri:
            request_uri = environ.get("PATH_INFO", "")
            if environ.get("QUERY_STRING"):
                request_uri += "?" + environ["QUERY_STRING"]

        path = urlsplit(request_uri).path
        if path != parsed_redirect.path:
            start_response("404 Not Found", [("Content-Type", "text/plain; charset=utf-8")])
            return [b"Not found"]

        response_url = redirect_uri
        if environ.get("QUERY_STRING"):
            response_url += "?" + environ["QUERY_STRING"]

        start_response("200 OK", [("Content-Type", "text/plain; charset=utf-8")])
        return [b"The authentication flow has completed. You may close this window."]

    print("Open this URL to authorize Gmail insertion:\n")
    print(auth_url)
    print(f"\nWaiting for OAuth callback on {redirect_uri} ...")

    server = wsgiref.simple_server.make_server(
        parsed_redirect.hostname,
        parsed_redirect.port,
        app,
    )
    server.handle_request()
    server.server_close()

    if not response_url:
        raise RuntimeError("OAuth callback was not received")

    flow.fetch_token(authorization_response=response_url)
    return flow.credentials


def build_raw_message(item: dict) -> str:
    sent_at = datetime.fromisoformat(item["date"])
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)

    msg = EmailMessage()
    msg["To"] = TO_ADDRESS
    msg["From"] = item["sender"]
    msg["Subject"] = item["subject"]
    msg["Date"] = format_datetime(sent_at)
    msg["Message-ID"] = make_msgid(domain="travel-seed.local")
    msg["X-Travel-Seed"] = "hackathon-2026"
    msg.set_content(item["body"])

    encoded = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
    return encoded


def insert_email(service, item: dict) -> str:
    message = {
        "raw": build_raw_message(item),
        "labelIds": ["INBOX", "UNREAD"],
    }
    result = (
        service.users()
        .messages()
        .insert(userId="me", body=message, internalDateSource="dateHeader")
        .execute()
    )
    return result["id"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Insert synthetic travel booking emails into the Gmail inbox."
    )
    parser.add_argument("--dry-run", action="store_true", help="Print subjects without inserting.")
    parser.add_argument(
        "--credentials",
        default=os.environ.get("SEED_CREDENTIALS_FILE", CREDENTIALS_FILE),
        help="OAuth client JSON file to use.",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("SEED_TOKEN_FILE", TOKEN_FILE),
        help="Authorized token JSON file to create or reuse.",
    )
    parser.add_argument(
        "--redirect-uri",
        default=os.environ.get("SEED_REDIRECT_URI", REDIRECT_URI),
        help="Registered OAuth redirect URI for this seed flow.",
    )
    args = parser.parse_args()

    if args.dry_run:
        for index, item in enumerate(TEST_EMAILS, start=1):
            print(f"{index:02d}. {item['date'][:10]} | {item['sender']} | {item['subject']}")
        print(f"\nDry run only. {len(TEST_EMAILS)} messages prepared.")
        return

    creds = load_credentials(args.credentials, args.token, args.redirect_uri)
    service = build("gmail", "v1", credentials=creds)

    for index, item in enumerate(TEST_EMAILS, start=1):
        msg_id = insert_email(service, item)
        print(f"{index:02d}/{len(TEST_EMAILS)} inserted {msg_id}: {item['subject']}")

    print(f"\nInserted {len(TEST_EMAILS)} synthetic travel emails into {TO_ADDRESS}.")


if __name__ == "__main__":
    main()
