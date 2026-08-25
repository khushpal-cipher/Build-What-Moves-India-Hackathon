# PassportPath

PassportPath is a mobile-first Passport Seva reimagining created for the **Build What Moves India** hackathon. It is an independent prototype: every citizen, document, slot, and fee interaction is mock data.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, then select **Start demo instantly**. The app works without an API key using an explicitly labelled, deterministic demo fallback. To enable the live structured OpenAI response, add a valid `OPENAI_API_KEY` to `.env.local` and restart the server.

## Architecture

- `app/page.tsx` — mobile-first citizen journey, 1-tap demo login, mock upload metadata, conversational form, and mock PSK booking.
- `app/api/passport-guide/route.ts` — server-only OpenAI Responses API call with a strict JSON schema.
- `lib/mockData.ts` — mock applicant, document rules, local fallback logic, appointment centres, slots, and fees.

No Aadhaar/PAN numbers, document images, OTPs, payment details, or real Passport Seva submissions are used.
