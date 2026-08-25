# PassportPath — Submission Deliverables

## 250-word summary

PassportPath reimagines the first-passport journey for Indian citizens. Applicants do not fail because they cannot fill boxes; they fail because they cannot tell which documents apply, which fields matter, or whether they are ready to book. That uncertainty sends people between a website, a help centre, call, and Passport Seva Kendra.

PassportPath replaces fragmentation with three clear steps. First, an AI document checker turns a checklist into plain-language readiness guidance. It identifies readiness, gaps, and originals to carry. Second, PassportGuide AI turns the form into a conversation. Citizens answer one question at a time on a phone; every answer immediately appears in an editable application draft. Third, the appointment screen shows nearby mock PSK and POPSK options, available slots, the fee, and a transparent confirmation state in one place.

PassportPath is designed for a 22-year-old student in Pune using a budget Android phone and a slow connection. It uses large touch targets, high-contrast text, concise language, persistent progress, and a one-tap fictional demo profile so judges can test it instantly. No Aadhaar, PAN, OTP, payment, document image, database, authentication, or government submission is real.

OpenAI is the core interaction layer, not a chat widget. A server-side Responses API endpoint sends only mock document metadata, the local ruleset, and the latest answer to GPT-5 mini. Structured Outputs return deterministic document statuses, extracted form fields, a helpful reply, and the next question. The UI renders that JSON directly, while a labelled local fallback keeps the demo usable if the API is unavailable.

## Two-minute video script

### 0:00–1:00 — Citizen walkthrough

**0:00–0:08**  
“This is PassportPath, my reimagined first-passport journey for Build What Moves India. It is designed for a young applicant using a phone on a slow connection.”

**0:08–0:18**  
“For a live demo, I tap Quick Demo Mode. In one tap, it loads Aarav, a fictional 22-year-old student in Pune, along with safe mock documents. No real identity data is used.”

**0:18–0:32**  
“Step one is document clarity. Instead of making Aarav decode a checklist, PassportGuide shows that his address and date-of-birth proofs are ready, and explains one supporting-ID reminder in plain language. A real applicant can also select a mock photo or PDF label here.”

**0:32–0:48**  
“Step two turns a long form into a conversation. I answer a question such as my full name or current address. The application draft updates immediately on the right, but it stays editable. This is much easier to use on a small screen than a long page of form fields.”

**0:48–1:00**  
“Finally, I choose a nearby Pune PSK, select a visible slot, see the normal passport fee of ₹1,500, and confirm a demo appointment. The final screen clearly says that no payment or government booking happened.”

### 1:00–2:00 — Technical and architecture rationale

**1:00–1:15**  
“The interface is a Next.js and Tailwind CSS application. It is mobile-first: high-contrast typography, large 48-pixel-plus touch targets, a linear three-step flow, and no heavy visual gimmicks.”

**1:15–1:32**  
“OpenAI is central to the product. The browser calls a server-side PassportGuide API route, so the API key is never exposed. The route uses the OpenAI Responses API and GPT-5 mini with Structured Outputs.”

**1:32–1:46**  
“The response has a strict JSON schema: a short citizen-friendly reply, document status objects, safely extracted form fields, and the next question. That deterministic contract lets React update the checklist and application draft without parsing fragile prose.”

**1:46–1:56**  
“Everything else is deliberately mocked in one data module: the fictional applicant, document rules, two Pune centres, available slots, and the ₹1,500 fee. No real Aadhaar, OTP, payment, upload, login, or Passport Seva integration exists.”

**1:56–2:00**  
“If the API or network is unavailable, a labelled local fallback keeps the demo working. PassportPath proves that citizen confidence—not more forms—is the service worth designing.”

## Three-step Vercel deployment checklist

1. **Push the repository.** Run `git init`, `git add .`, `git commit -m "Build PassportPath prototype"`, create an empty GitHub repository, then run `git branch -M main`, `git remote add origin <your-github-repository-url>`, and `git push -u origin main`.
2. **Import and configure Vercel.** In Vercel, choose **Add New → Project**, import the GitHub repository, and keep the detected Next.js settings. Under **Environment Variables**, add `OPENAI_API_KEY` for Production, Preview, and Development. The demo still runs without this key, but PassportGuide uses the labelled local fallback.
3. **Deploy and test.** Click **Deploy**. On the live URL, select **Start demo instantly**, run the document check, use one chat answer, select a slot, and confirm that the final screen states it is a demo. Use the Vercel URL in the hackathon submission.
