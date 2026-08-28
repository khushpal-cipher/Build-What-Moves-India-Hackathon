# 🛂 PassportPath: Next-Gen Civic Tech for India

**Built for the "Build What Moves India" Hackathon 2026** 🇮🇳
Live Deployment: [Insert Your Vercel Link Here]

PassportPath is an AI-powered, mobile-first reimagining of the Indian Passport Seva portal. We replace opaque, frustrating bureaucracy with a conversational, intelligent, and multi-lingual Civic Companion that guides citizens from document upload to final police verification.

---

## 🛑 The Problem: The Current Passport Seva Experience
The existing government portal creates immense friction for the average citizen:
1. **Opaque Uploads:** The site demands exact photo/PDF dimensions and fails silently, leading to the dreaded "12-attempt account lock."
2. **Cognitive Overload:** Users are forced to navigate a massive, intimidating, English-heavy web form.
3. **Document Discrepancies:** Minor name mismatches between Aadhaar and PAN cause rejections *after* paying fees and traveling to the PSK.
4. **The "Black Box" Tracker:** Police Verification often gets delayed for 30–90 days with a vague "Pending" status and no clear path to escalate.

---

## ✨ The Solution: Why PassportPath is Better
We built a progressive, AI-first platform to solve every single one of those bottlenecks. 

| ❌ Current Portal | ✅ PassportPath (Our Fix) |
| :--- | :--- |
| **Silent Document Rejections** | **Smart Upload Doctor:** Uses Gemini 1.5 Flash Vision to pre-check documents (Aadhaar, PAN) *before* submission, instantly catching blurs or typos. |
| **Massive 10-Page Web Forms** | **Conversational UI:** A 1-on-1 AI chat interface that extracts 17 complex data points into a clean, auto-saving JSON Live Draft. |
| **English-Only Barriers** | **Civic Companion Mode:** Speak to the AI in Hindi or Marathi, and it seamlessly translates while keeping the backend database in standard English. |
| **"Pending" Limbo** | **Transparent Tracker & Escalation:** Visually tracks the application. If Police Verification breaches the 30-day SLA, it auto-drafts an official CPGRAMS grievance. |
| **Session Timeouts & Lost Data** | **Zero-Friction Auto-Save:** Powered by Clerk Auth and MongoDB, every single chat message is silently saved to the cloud so citizens never lose progress. |

---

## 🛠 Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Backend:** Next.js API Routes, Node.js
* **Database:** MongoDB (via Mongoose)
* **Authentication:** Clerk
* **AI Engine:** Gemini 1.5 Flash (Multimodal Vision & NLP)
* **Deployment:** Vercel

---

## 🎥 Video Demo Guide (For the Video Editor)
If you are recording the demo video for the judges, follow this exact 2-minute script:

1. **The Hook (0:00 - 0:20):** Briefly show a screenshot of the old Passport Seva site's confusing PDF instructions. Then, switch to our beautiful PassportPath UI.
2. **The Vision AI (0:20 - 0:50):** Go to Step 1 (Documents). Upload the dummy "Twitterpreet Singh" PAN card. Show the UI spinning as Gemini checks it, and then turning green with "Verified". 
3. **The Multi-lingual Chat (0:50 - 1:20):** Go to Step 2. Select **Marathi** or **Hindi** from the top dropdown. Type a quick greeting like "Namaste". Show how the AI replies in the native language while the "Live Draft" panel on the right updates perfectly.
4. **The Hackathon Bypass (1:20 - 1:40):** Click the **"⚡ Instant Fill (Bypass)"** button to instantly populate the database and skip to the end (great for saving time in the video). Click "Review PSK Slots".
5. **The Civic Impact (1:40 - 2:00):** Go to Step 4 (Track Application). Point out the delayed Police Verification. Click the **"Auto-Draft Grievance"** button to show how we empower citizens to fight delays using the CPGRAMS portal.

---

## 💻 Run it Locally
1. Clone the repository: `git clone https://github.com/your-username/build-what-moves-india-hackathon.git`
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`:
   * `GEMINI_API_KEY`
   * `MONGODB_URI`
   * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   * `CLERK_SECRET_KEY`
4. Start the development server: `npm run dev`