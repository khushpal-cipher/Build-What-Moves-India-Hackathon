"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  appointmentCentres,
  demoApplicant,
  demoDocuments,
  emptyApplicant,
  emptyDocuments,
  formQuestions,
  makeLocalGuideResponse,
  passportRules,
  type ApplicantDraft,
  type DocumentId,
  type DocumentRecord,
  type DocumentStatus,
  type GuideResponse
} from "@/lib/mockData";

type Step = 1 | 2 | 3 | 4;
type ChatMessage = { role: "assistant" | "user"; content: string };
type FormField = (typeof formQuestions)[number]["field"];

const stepLabels = ["Documents", "AI form", "Appointment"];

const statusStyles: Record<DocumentStatus, string> = {
  ready: "bg-emerald-100 text-emerald-950 ring-1 ring-inset ring-emerald-300",
  needs_attention: "bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-300",
  missing: "bg-rose-100 text-rose-950 ring-1 ring-inset ring-rose-300",
  unverified: "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-300"
};

const statusLabels: Record<DocumentStatus, string> = {
  ready: "Ready",
  needs_attention: "Needs attention",
  missing: "Missing",
  unverified: "Not checked"
};

function isReadyToBook(applicant: ApplicantDraft) {
  return [
    applicant.fullName,
    applicant.dateOfBirth,
    applicant.email,
    applicant.mobile,
    applicant.parentName,
    applicant.currentAddress,
    applicant.permanentAddress
  ].every(Boolean);
}

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [applicant, setApplicant] = useState<ApplicantDraft>(emptyApplicant);
  const [documents, setDocuments] = useState<DocumentRecord[]>(emptyDocuments);
  const [documentSummary, setDocumentSummary] = useState(
    "Add mock documents, then ask PassportGuide AI to explain what is ready."
  );
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "I’ll turn a long application into a short conversation. You can review every answer before booking."
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<string>(appointmentCentres[0].id);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(appointmentCentres[0].slots[0].id);
  const [demoActive, setDemoActive] = useState(false);
  const [notice, setNotice] = useState("");

  const currentQuestion = formQuestions[questionIndex];
  const selectedCentre = useMemo(
    () => appointmentCentres.find((centre) => centre.id === selectedCentreId) ?? appointmentCentres[0],
    [selectedCentreId]
  );
  const selectedSlot = selectedCentre.slots.find((slot) => slot.id === selectedSlotId) ?? selectedCentre.slots[0];
  const readyDocuments = documents.filter((document) => document.status === "ready").length;
  const formComplete = isReadyToBook(applicant);

  function activateDemo() {
    setApplicant(demoApplicant);
    setDocuments(demoDocuments.map((document) => ({ ...document })));
    setDocumentSummary("Demo checklist loaded: two essentials are ready and one supporting ID has a helpful reminder.");
    setMessages([
      {
        role: "assistant",
        content: "Quick Demo Mode loaded Aarav’s safe mock profile. Ask a question or use the demo answers to see the form synchronise."
      }
    ]);
    setQuestionIndex(0);
    setAnswer("");
    setDemoActive(true);
    setStep(1);
    setNotice("Quick Demo Mode is on. No real identity, document, OTP, or payment data is used.");
  }

  function updateMockFile(id: DocumentId, fileName: string) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              mockFileName: fileName,
              uploaded: Boolean(fileName),
              status: "unverified",
              note: fileName
                ? "Mock file added. Ask PassportGuide AI to check it against this demo ruleset."
                : "No mock file has been selected yet."
            }
          : document
      )
    );
    setNotice("Mock file name saved locally. No document image is uploaded or sent to the AI in this prototype.");
  }

  function applyDocumentChecks(checks: GuideResponse["documentChecks"]) {
    if (!checks.length) return;
    setDocuments((current) =>
      current.map((document) => {
        const result = checks.find((check) => check.id === document.id);
        return result ? { ...document, status: result.status, note: result.note } : document;
      })
    );
  }

  async function callPassportGuide(payload: Record<string, unknown>): Promise<GuideResponse | null> {
    try {
      const response = await fetch("/api/passport-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Guide unavailable");
      return (await response.json()) as GuideResponse;
    } catch {
      return null;
    }
  }

  async function checkDocuments() {
    setIsCheckingDocuments(true);
    setNotice("");
    const aiResult = await callPassportGuide({
      mode: "documents",
      application: applicant,
      documents
    });
    const result = aiResult ?? makeLocalGuideResponse("documents", documents);
    applyDocumentChecks(result.documentChecks);
    setDocumentSummary(result.reply);
    setNotice(
      aiResult
        ? "PassportGuide AI checked mock metadata against the local demo rules."
        : "Demo-safe fallback used. Add OPENAI_API_KEY to enable the live PassportGuide AI check."
    );
    setIsCheckingDocuments(false);
  }

  function continueToForm() {
    setStep(2);
    setNotice("Step 2 of 3: answer one plain-language question at a time. Every answer remains editable.");
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentQuestion || !answer.trim()) return;

    const latestAnswer = answer.trim();
    const nextQuestion = formQuestions[questionIndex + 1]?.question ?? "Your draft is ready for appointment booking.";
    setIsSending(true);
    setNotice("");

    const aiResult = await callPassportGuide({
      mode: "form",
      application: applicant,
      documents,
      message: latestAnswer,
      currentField: currentQuestion.field,
      nextQuestion
    });
    const fallback = makeLocalGuideResponse(
      "form",
      documents,
      currentQuestion.field,
      latestAnswer,
      nextQuestion
    );
    const result = aiResult ?? fallback;
    const extracted = result.extractedFields[currentQuestion.field];
    const cleanedAnswer = latestAnswer.toLowerCase() === "same as current address"
      ? applicant.currentAddress
      : extracted?.trim() || latestAnswer;

    setApplicant((current) => ({ ...current, [currentQuestion.field]: cleanedAnswer }));
    setMessages((current) => [
      ...current,
      { role: "user", content: latestAnswer },
      { role: "assistant", content: `${result.reply} ${nextQuestion}` }
    ]);
    setAnswer("");
    setQuestionIndex((current) => current + 1);
    setIsSending(false);
    setNotice(aiResult ? "PassportGuide AI updated your draft." : "Demo-safe fallback updated your draft.");
  }

  function useDemoAnswer() {
    if (!currentQuestion) return;
    setAnswer(demoApplicant[currentQuestion.field as FormField]);
  }

  function chooseCentre(centreId: string) {
    const centre = appointmentCentres.find((item) => item.id === centreId) ?? appointmentCentres[0];
    setSelectedCentreId(centre.id);
    setSelectedSlotId(centre.slots[0].id);
  }

  async function confirmAppointment() {
    setNotice("Saving your appointment to the database...");
    
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...applicant, // Spread the extracted form fields
          pskCentreId: selectedCentreId,
          appointmentSlotId: selectedSlotId,
          appointmentFee: passportRules.appointment.normalFee
        }),
      });

      if (!response.ok) {
        throw new Error("Database save failed");
      }

      // Success! Move to the final confirmation screen
      setStep(4);
      setNotice("Demo appointment confirmed and saved to database! No money was charged.");
      
    } catch (error) {
      console.error(error);
      setNotice("Error: Could not save the appointment to the database. Check your network or MongoDB connection.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        <header className="rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-card sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Build What Moves India</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">PassportPath</h1>
              <p className="mt-2 max-w-2xl text-base leading-6 text-slate-200">
                A calmer, mobile-first path to a first passport. Built as an independent hackathon prototype.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">DEMO ONLY</span>
          </div>
        </header>

        <section className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm" aria-labelledby="demo-mode-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="demo-mode-title" className="text-lg font-black text-slate-950">Quick Demo Mode / 1-Tap Login</h2>
              <p className="mt-1 text-sm font-medium text-slate-800">Pre-fills Aarav’s fictional profile, mock documents, and a ready-to-review application.</p>
            </div>
            <button
              type="button"
              onClick={activateDemo}
              className="min-h-12 shrink-0 rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white transition hover:bg-slate-800"
            >
              {demoActive ? "Reload demo profile" : "Start demo instantly"}
            </button>
          </div>
        </section>

        <p className="sr-only" aria-live="polite">{notice}</p>

        <nav className="mt-6" aria-label="Application progress">
          <ol className="grid grid-cols-3 gap-2">
            {stepLabels.map((label, index) => {
              const number = index + 1;
              const active = step === number;
              const complete = step > number;
              return (
                <li key={label} className={`rounded-xl border-2 p-3 text-center ${active ? "border-slate-950 bg-slate-950 text-white" : complete ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-700"}`}>
                  <span className="block text-xs font-bold uppercase tracking-wide">Step {number}</span>
                  <span className="mt-1 block text-sm font-black">{label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        {step === 1 && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]" aria-labelledby="document-checker-title">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-800">Step 1 · Document check</p>
              <h2 id="document-checker-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">Know what to carry before you book</h2>
              <p className="mt-2 text-base leading-6 text-slate-700">Add mock files or use the demo profile. PassportGuide checks document labels against a transparent local ruleset; it does not inspect or store real identity documents.</p>

              <div className="mt-6 space-y-3">
                {documents.map((document) => (
                  <article key={document.id} className="rounded-2xl border-2 border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{document.title}</h3>
                        <p className="mt-1 text-sm leading-5 text-slate-700">Accepted examples: {document.acceptedExamples}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[document.status]}`}>{statusLabels[document.status]}</span>
                    </div>
                    <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 transition hover:border-blue-700 hover:bg-blue-50">
                      <span className="block text-sm font-black text-slate-900">Mock photo / PDF upload</span>
                      <span className="mt-1 block text-sm text-slate-700">{document.mockFileName || "Choose a mock file from your device"}</span>
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(event) => updateMockFile(document.id, event.target.files?.[0]?.name ?? "")}
                      />
                    </label>
                    <p className="mt-3 text-sm font-medium leading-5 text-slate-800">{document.note}</p>
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={checkDocuments}
                disabled={isCheckingDocuments}
                className="mt-5 min-h-12 w-full rounded-xl bg-blue-800 px-5 py-3 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:bg-slate-500"
              >
                {isCheckingDocuments ? "Checking your demo checklist…" : "Check documents with PassportGuide AI"}
              </button>
            </div>

            <aside className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-900">Plain-language result</p>
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-lg font-black text-slate-950">{readyDocuments}/3 ready</p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{documentSummary}</p>
              </div>
              <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4">
                <h3 className="font-black text-slate-950">Why this is safer</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">In this prototype, only mock filenames and document categories are checked. Real numbers, images, OTPs, payments, and government submission are out of scope.</p>
              </div>
              <button
                type="button"
                onClick={continueToForm}
                className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white transition hover:bg-slate-800"
              >
                Continue to 3-minute form
              </button>
            </aside>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="form-filler-title">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-800">Step 2 · Conversational form</p>
              <h2 id="form-filler-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">A real form, one human question at a time</h2>
              <p className="mt-2 text-base leading-6 text-slate-700">This is a 3-minute guided conversation. PassportGuide turns each answer into an editable field.</p>

              <div className="mt-5 max-h-[330px] space-y-3 overflow-y-auto rounded-2xl bg-slate-100 p-4" aria-live="polite">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "assistant" ? "bg-white text-slate-900 shadow-sm" : "ml-auto bg-slate-950 text-white"}`}>
                    <p className="mb-1 text-xs font-black uppercase tracking-wide opacity-70">{message.role === "assistant" ? "PassportGuide AI" : "You"}</p>
                    {message.content}
                  </div>
                ))}
              </div>

              {currentQuestion ? (
                <form className="mt-5" onSubmit={submitAnswer}>
                  <label htmlFor="citizen-answer" className="block text-base font-black text-slate-950">{currentQuestion.question}</label>
                  <p id="answer-hint" className="mt-1 text-sm text-slate-700">{currentQuestion.hint}</p>
                  <textarea
                    id="citizen-answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={3}
                    aria-describedby="answer-hint"
                    className="mt-3 w-full resize-none rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950 placeholder:text-slate-500"
                    placeholder="Type your answer here"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={useDemoAnswer} className="min-h-12 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 text-base font-black text-slate-950 hover:bg-slate-100">Use demo answer</button>
                    <button type="submit" disabled={isSending || !answer.trim()} className="min-h-12 rounded-xl bg-blue-800 px-4 py-3 text-base font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400">
                      {isSending ? "Updating draft…" : "Add to my application"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
                  <h3 className="font-black text-emerald-950">Conversation complete</h3>
                  <p className="mt-1 text-sm leading-6 text-emerald-950">Your draft is ready to review. You can still edit every value below.</p>
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-800">Live application draft</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Review, never retype</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${formComplete ? statusStyles.ready : statusStyles.unverified}`}>{formComplete ? "Ready to book" : "In progress"}</span>
              </div>
              <dl className="mt-5 space-y-3">
                {[
                  ["Full name", applicant.fullName],
                  ["Date of birth", applicant.dateOfBirth],
                  ["Email", applicant.email],
                  ["Mobile", applicant.mobile],
                  ["Parent / guardian", applicant.parentName],
                  ["Current address", applicant.currentAddress],
                  ["Permanent address", applicant.permanentAddress]
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-slate-200 pb-3 last:border-0">
                    <dt className="text-xs font-black uppercase tracking-wide text-slate-600">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-bold leading-5 text-slate-950">{value || "Waiting for your answer"}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!formComplete}
                className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Review PSK slots and fee
              </button>
              {!formComplete && <p className="mt-2 text-center text-xs font-bold text-slate-600">Use Quick Demo Mode to pre-fill every mock field.</p>}
            </aside>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="appointment-title">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-800">Step 3 · Appointment</p>
              <h2 id="appointment-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">Choose a PSK slot with no surprises</h2>
              <p className="mt-2 text-base leading-6 text-slate-700">Centre and slot availability below are static mock data for the hackathon demo.</p>

              <fieldset className="mt-6">
                <legend className="text-base font-black text-slate-950">Choose a nearby centre</legend>
                <div className="mt-3 grid gap-3">
                  {appointmentCentres.map((centre) => (
                    <label key={centre.id} className={`cursor-pointer rounded-2xl border-2 p-4 transition ${selectedCentreId === centre.id ? "border-blue-800 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                      <input className="sr-only" type="radio" name="centre" checked={selectedCentreId === centre.id} onChange={() => chooseCentre(centre.id)} />
                      <span className="block font-black text-slate-950">{centre.name}</span>
                      <span className="mt-1 block text-sm font-medium text-slate-700">{centre.locality} · {centre.distance}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-6">
                <legend className="text-base font-black text-slate-950">Choose an available time</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {selectedCentre.slots.map((slot) => (
                    <label key={slot.id} className={`cursor-pointer rounded-2xl border-2 p-4 text-center transition ${selectedSlotId === slot.id ? "border-blue-800 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                      <input className="sr-only" type="radio" name="slot" checked={selectedSlotId === slot.id} onChange={() => setSelectedSlotId(slot.id)} />
                      <span className="block text-sm font-black text-slate-950">{slot.date}</span>
                      <span className="mt-1 block text-base font-black text-blue-900">{slot.time}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <aside className="rounded-3xl bg-slate-950 p-5 text-white shadow-card sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-300">Clear fee summary</p>
              <h3 className="mt-2 text-2xl font-black">Normal passport application</h3>
              <dl className="mt-6 space-y-3 border-y border-slate-700 py-5">
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-200">Application fee</dt><dd className="text-xl font-black">₹{passportRules.appointment.normalFee.toLocaleString("en-IN")}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-200">Selected slot</dt><dd className="text-right font-black">{selectedSlot.date}<br />{selectedSlot.time}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-200">Centre</dt><dd className="text-right font-black">{selectedCentre.locality}</dd></div>
              </dl>
              <p className="mt-5 rounded-2xl bg-slate-800 p-4 text-sm leading-6 text-slate-100">{passportRules.appointment.originalsMessage}</p>
              <button type="button" onClick={confirmAppointment} className="mt-5 min-h-12 w-full rounded-xl bg-amber-300 px-5 py-3 text-base font-black text-slate-950 transition hover:bg-amber-200">Confirm demo appointment</button>
              <p className="mt-3 text-center text-xs font-bold text-slate-300">No payment or government booking happens in this demo.</p>
            </aside>
          </section>
        )}

        {step === 4 && (
          <section className="mx-auto mt-8 max-w-2xl rounded-3xl border-2 border-emerald-300 bg-white p-6 text-center shadow-card sm:p-10" aria-labelledby="confirmation-title">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl" aria-hidden="true">✓</div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-emerald-800">Demo complete</p>
            <h2 id="confirmation-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950">Your demo slot is reserved</h2>
            <p className="mt-3 text-base leading-7 text-slate-700">Aarav’s fictional application is set for <strong>{selectedSlot.date}, {selectedSlot.time}</strong> at <strong>{selectedCentre.name}</strong>.</p>
            <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-left">
              <p className="font-black text-slate-950">What this demonstrates</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">Document clarity, a conversational form, editable citizen-controlled data, and an appointment decision that is clear on a small screen.</p>
            </div>
            <button type="button" onClick={activateDemo} className="mt-6 min-h-12 rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white hover:bg-slate-800">Restart the demo</button>
          </section>
        )}

        <footer className="mt-8 text-center text-xs font-medium leading-5 text-slate-600">
          {passportRules.prototypeNotice} Built for a hackathon; not affiliated with Passport Seva or the Government of India.
        </footer>
      </div>
    </main>
  );
}
