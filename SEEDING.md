# Travel Email Seeding

This directory includes standalone scripts for seeding a Gmail inbox with travel
booking messages for hackathon demos.

## Scripts

- `seed_travel_emails.py` inserts 25 synthetic booking emails through the Gmail
  API. This is the preferred script because it can create messages with realistic
  `From` headers such as Booking.com, Airbnb, easyJet, Expedia, Hotels.com, and
  GetYourGuide.
- `gmail_web_seed.py` is a fallback that uses the Gmail web UI to send messages
  to the same inbox. It is less realistic because the messages are sent from the
  test Gmail account itself.

## What Gets Seeded

The Gmail API seeder inserts 25 unread inbox messages with dates from January
through April 2026. They include flights, hotels, Airbnb stays, tours, food
experiences, museums, cycling tours, nightlife, cruises, and wellness signals.

The parser should find them because they use known travel domains and
confirmation-style subjects.

## Setup

Install dependencies in a local virtual environment:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

If using the browser fallback script, install Playwright in the same local
environment:

```bash
.venv/bin/python -m pip install playwright
```

## Gmail API Seeder

The OAuth client in Google Cloud must include the exact redirect URI used by the
script. For the current local workflow, use:

```text
http://localhost:5001/oauth/callback
```

Run the seeder:

```bash
.venv/bin/python seed_travel_emails.py \
  --redirect-uri http://localhost:5001/oauth/callback
```

The script prints a Google OAuth URL. Open it, sign in to the test Gmail account,
and approve access. After the callback completes, the script inserts all 25
messages and prints each inserted Gmail message ID.

If using a separate downloaded OAuth client JSON, keep it out of git and run:

```bash
.venv/bin/python seed_travel_emails.py \
  --credentials seed_credentials.json \
  --redirect-uri http://localhost:5001/oauth/callback
```

## Verifying Seeded Emails

Search in Gmail for:

```text
from:booking.com newer_than:180d
```

or:

```text
subject:"Your stay in Lisbon is confirmed"
```

The messages are inserted with realistic dates, so they may not appear at the
very top of the inbox.

## Secret Handling

Do not commit any of these files:

- `credentials.json`
- `seed_credentials.json`
- `token.json`
- `seed_token.json`
- `.env`
- `.venv/`
- `venv/`

The local `.gitignore` excludes these files. Before committing, run:

```bash
git status --short
git diff --cached --name-only
git grep -n -I -E "client_secret|refresh_token|access_token|api[_-]?key|password|BEGIN (RSA|OPENSSH|PRIVATE) KEY" -- .
```

If a token or credential file appears in `git status`, remove it from the
working tree or keep it ignored before committing.

## Commit And Pull Workflow

Check the current changes:

```bash
git status --short
```

Stage only the intended files:

```bash
git add email-travel-parser/.gitignore \
  email-travel-parser/SEEDING.md \
  email-travel-parser/seed_travel_emails.py \
  email-travel-parser/gmail_web_seed.py
```

Commit:

```bash
git commit -m "Add Gmail travel email seeding scripts"
```

Pull latest changes after committing local work:

```bash
git pull --rebase
```

If there are conflicts, inspect them:

```bash
git status
```

Open each conflicted file, resolve the conflict markers, then continue:

```bash
git add <resolved-file>
git rebase --continue
```

If the rebase is not salvageable, stop and return to the pre-rebase state:

```bash
git rebase --abort
```
