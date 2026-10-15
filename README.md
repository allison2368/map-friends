# map-friends

An interactive US map of friends, styled like a Felt map, with typewriter type and pin popups from a Google Form.

## How it works

1. Friends fill out a Google Form (name, location, photos, questions).
2. Form answers land in a Google Sheet.
3. The site reads the published sheet and drops a named pin on each location.
4. Click a name to open a popup: photo carousel, then each form question above its answer.

Until a sheet URL is configured, the map shows sample friends so you can see the design.

## Connect a Google Form

1. Create a form with at least:
   - **Name**
   - **Location** (city and state, or a full address)
   - One or more **file upload** questions for pictures
   - Any other questions you want listed in the popup
2. Send responses to a spreadsheet.
3. In the sheet: **File → Share → Publish to web → Comma-separated values (.csv)**.
4. Put that CSV URL in `GOOGLE_SHEETS_CSV_URL`.
5. Put the live form link in `GOOGLE_FORM_URL` (and `NEXT_PUBLIC_GOOGLE_FORM_URL` if you want the “Add yourself” button).

Optional sheet columns `lat` and `lng` skip geocoding.

Google Drive photos need to be viewable. If a picture does not load, open the form’s Drive folder and set those files to “Anyone with the link”.

## Local

```bash
npm install
npm run dev
```

Node 20.9+ is required (Vercel’s default is fine).

## Deploy on Vercel

Import this repo, then add the env vars from `.env.example`.
