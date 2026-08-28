"use client";
import { SignInButton, UserButton, Show, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

interface ApplicantData {
  fullName: string;
  aliasName: string;
  gender: string;
  dob: string;
  placeOfBirth: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  email: string;
  mobile: string;
  currentAddress: string;
  previousAddress: string;
  permanentAddress: string;
  education: string;
  employmentType: string;
  distinguishingMark: string;
  criminalRecord: string;
}

export default function PassportPathDesktop() {
  const [language, setLanguage] = useState("English");
  const { userId } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Fetch saved progress when the user logs in
  useEffect(() => {
    if (userId) {
      fetch('/api/draft')
        .then(res => res.json())
        .then(data => {
          if (data.draft) {
             setApplicant(data.draft);
             setChatHistory(prev => [...prev, { role: "ai", text: "Welcome back! I've securely restored your previous draft. Let's continue." }]);
          }
        })
        .catch(err => console.error("Failed to load draft:", err));
    }
  }, [userId]);

  const [activeTab, setActiveTab] = useState<
    "documents" | "application" | "appointment" | "track"
  >("documents");

  const [docs, setDocs] = useState({ address: false, dob: false, ecr: false });
  const [isScanning, setIsScanning] = useState({
    address: false,
    dob: false,
    ecr: false,
  });

  // STATES FOR CONSISTENCY CHECK
  const [docImages, setDocImages] = useState({ address: "", dob: "", ecr: "" });
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  
  const allDocsUploaded = docs.address && docs.dob && docs.ecr;
  const canProceedToApp = isDemoMode || allDocsUploaded;

  const [chatInput, setChatInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicant, setApplicant] = useState<Partial<ApplicantData>>({});
  const [chatHistory, setChatHistory] = useState([
    {
      role: "ai",
      text: "What is your full name, exactly as it appears on your identity proofs?",
    },
  ]);

  const isReadyToBook = (data: Partial<ApplicantData>) => {
    return !!(
      data.fullName && data.aliasName && data.gender && data.dob &&
      data.placeOfBirth && data.fatherName && data.motherName &&
      data.spouseName && data.mobile && data.email && data.currentAddress &&
      data.previousAddress && data.permanentAddress && data.education &&
      data.employmentType && data.distinguishingMark && data.criminalRecord
    );
  };

  const handleInstantFill = () => {
    const demoData = {
      fullName: "Twitterpreet Singh",
      aliasName: "None",
      gender: "Male",
      dob: "1995-05-14",
      placeOfBirth: "Pune, Maharashtra, India",
      fatherName: "Balwinder Singh",
      motherName: "Gurpreet Kaur",
      spouseName: "Not Married",
      mobile: "9876543210",
      email: "twitterpreet@example.com",
      currentAddress: "120, FC Road, Pune - 411004",
      previousAddress: "No",
      permanentAddress: "Same",
      education: "10th Pass",
      employmentType: "Private",
      distinguishingMark: "None",
      criminalRecord: "No"
    };
    
    setApplicant(demoData);
    setChatHistory(prev => [...prev, { role: "ai", text: "Draft complete! Please review your details on the right and click 'Review PSK Slots & Fee' to proceed." }]);

    if (userId) {
      fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: demoData }) 
      });
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "address" | "dob" | "ecr",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning((prev) => ({ ...prev, [docType]: true }));

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setDocImages(prev => ({ ...prev, [docType]: base64Data }));
        
        const response = await fetch("/api/verify-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64Data,
            mimeType: file.type,
            docType: docType === "address" ? "Address Proof" : docType === "dob" ? "Date of Birth Proof" : "Non-ECR Proof",
          }),
        });
        const data = await response.json();
        if (data.isValid) {
          setDocs((prev) => ({ ...prev, [docType]: true }));
        } else {
          alert(`PassportGuide AI Alert: This document does not look valid. Please upload a clearer copy.`);
        }
        setIsScanning((prev) => ({ ...prev, [docType]: false }));
      };
    } catch (error) {
      console.error("Upload failed", error);
      setIsScanning((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!chatInput.trim()) return;
    
    setIsSubmitting(true);
    const userText = chatInput;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const response = await fetch("/api/passport-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, currentDraft: applicant, language: language }), 
      });
      
      if (!response.ok) throw new Error("API Route failed.");
      const data = await response.json();

      if (data.extractedFields)
        setApplicant((prev) => ({ ...prev, ...data.extractedFields }));
      if (data.reply)
        setChatHistory((prev) => [...prev, { role: "ai", text: data.reply }]);

      if (userId && data.extractedFields) {
        fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: { ...applicant, ...data.extractedFields } }) 
        });
      }
    } catch (error) {
      console.error("API Error:", error);
      setChatHistory((prev) => [...prev, { role: "ai", text: "⚠️ Error connecting to API." }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const draftFields = [
    { label: "Full Name", value: applicant.fullName },
    { label: "Alias / Other Names", value: applicant.aliasName },
    { label: "Gender", value: applicant.gender },
    { label: "Date of Birth", value: applicant.dob },
    { label: "Place of Birth", value: applicant.placeOfBirth },
    { label: "Father's Name", value: applicant.fatherName },
    { label: "Mother's Name", value: applicant.motherName },
    { label: "Spouse's Name", value: applicant.spouseName },
    { label: "Mobile Number", value: applicant.mobile },
    { label: "Email Address", value: applicant.email },
    { label: "Current Address", value: applicant.currentAddress },
    { label: "Previous Address (1 Yr)", value: applicant.previousAddress },
    { label: "Permanent Address", value: applicant.permanentAddress },
    { label: "Education Level", value: applicant.education },
    { label: "Employment Type", value: applicant.employmentType },
    { label: "Distinguishing Marks", value: applicant.distinguishingMark },
    { label: "Criminal Record", value: applicant.criminalRecord },
  ];

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-[1440px] h-[90vh] bg-white rounded-[2rem] shadow-2xl flex overflow-hidden border border-gray-200">
        
        {/* --- LEFT SIDEBAR --- */}
        <aside className="w-[280px] border-r border-gray-100 flex flex-col justify-between shrink-0 bg-white">
          <div>
            <div className="p-8 pb-6 flex items-center gap-3 border-b border-gray-50">
              <div className="w-12 h-12 bg-gov-navy rounded flex items-center justify-center text-white text-[10px] font-bold text-center leading-tight">
                Emblem
              </div>
              <div>
                <h1 className="text-xl font-bold text-gov-navy tracking-tight leading-none">Passport Seva</h1>
                <p className="text-[10px] text-gov-orange font-bold tracking-wider uppercase mt-1">Service Excellence</p>
              </div>
            </div>
            <div className="mt-4 px-4 space-y-2">
              <button onClick={() => setActiveTab("documents")} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left text-sm font-semibold transition-colors ${activeTab === "documents" ? "bg-gov-navy text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
                <span className="text-lg">📄</span> 1. Documents
              </button>
              <button onClick={() => canProceedToApp ? setActiveTab("application") : alert("Upload required documents first.")} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left text-sm font-semibold transition-colors ${activeTab === "application" ? "bg-gov-navy text-white shadow-md" : "text-gray-500 hover:bg-gray-50"} ${!canProceedToApp && "opacity-50 grayscale cursor-not-allowed"}`}>
                <span className="text-lg">▲</span> 2. Passport Application
              </button>
              <button onClick={() => isReadyToBook(applicant) ? setActiveTab("appointment") : alert("Complete the application first.")} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left text-sm font-semibold transition-colors ${activeTab === "appointment" ? "bg-gov-navy text-white shadow-md" : "text-gray-500 hover:bg-gray-50"} ${!isReadyToBook(applicant) && "opacity-50 cursor-not-allowed"}`}>
                <span className="text-lg">📅</span> 3. Book Appointment
              </button>
              <button onClick={() => setActiveTab("track")} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left text-sm font-semibold transition-colors ${activeTab === "track" ? "bg-gov-navy text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
                <span className="text-lg">📍</span> Track Application
              </button>
            </div>
          </div>
        </aside>

        {/* --- RIGHT CONTENT PANEL --- */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <header className="h-[100px] border-b border-gray-100 px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xl font-light pl-2">«</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input type="text" placeholder="Search Passport FAQ's, etc" className="w-[400px] bg-[#F5F5F5] text-sm text-gray-600 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-gov-navy/10" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Live</span>
                <button onClick={() => setIsDemoMode(!isDemoMode)} className={`w-10 h-5 rounded-full transition-colors relative ${isDemoMode ? "bg-gov-orange" : "bg-gray-200"}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${isDemoMode ? "translate-x-[22px]" : "translate-x-1"}`} />
                </button>
                <span className="text-[10px] font-bold text-gov-navy uppercase">Demo</span>
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 font-medium bg-white hover:bg-gray-50 focus:outline-none cursor-pointer shadow-sm transition-all">
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Marathi">मराठी (Marathi)</option>
              </select>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="bg-gov-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-gov-navy/90 transition-all">Sign In</button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-12 bg-white">
            
            {/* STEP 1: SMART UPLOAD DOCTOR */}
            {activeTab === "documents" && (
              <div className="max-w-[1200px]">
                <h2 className="text-4xl font-extrabold text-gov-navy mb-3">Pre-Flight Document Check</h2>
                <p className="text-xl text-gray-500 mb-8">Upload your required proofs here. PassportGuide AI will scan them to ensure they match perfectly before you apply.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[280px]">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-gov-navy">1. Address Proof</h3>
                      <p className="text-xs text-gray-500 mt-1">Utility Bill, Rent Agreement</p>
                    </div>
                    <input type="file" id="upload-address" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileUpload(e, "address")} />
                    <label htmlFor="upload-address" className={`mt-auto border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${docs.address ? "bg-[#E6F4EA] border-[#137333] cursor-default" : isScanning.address ? "bg-blue-50 border-blue-300 cursor-wait" : "bg-white border-[#C8E0FF] hover:bg-blue-50 cursor-pointer"}`}>
                      {docs.address ? (<><span className="text-3xl mb-2">✅</span><p className="text-sm font-bold text-[#137333]">Verified</p></>) : isScanning.address ? (<><span className="text-3xl mb-2 animate-spin">⚙️</span><p className="text-sm font-bold text-blue-600">Scanning...</p></>) : (<><span className="text-3xl mb-2">📄</span><p className="text-sm font-semibold text-gov-navy">Browse Files</p></>)}
                    </label>
                  </div>

                  <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[280px]">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-gov-navy">2. Date of Birth Proof</h3>
                      <p className="text-xs text-gray-500 mt-1">Birth Certificate, PAN Card, Class 10</p>
                    </div>
                    <input type="file" id="upload-dob" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileUpload(e, "dob")} />
                    <label htmlFor="upload-dob" className={`mt-auto border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${docs.dob ? "bg-[#E6F4EA] border-[#137333] cursor-default" : isScanning.dob ? "bg-blue-50 border-blue-300 cursor-wait" : "bg-white border-[#C8E0FF] hover:bg-blue-50 cursor-pointer"}`}>
                      {docs.dob ? (<><span className="text-3xl mb-2">✅</span><p className="text-sm font-bold text-[#137333]">Verified</p></>) : isScanning.dob ? (<><span className="text-3xl mb-2 animate-spin">⚙️</span><p className="text-sm font-bold text-blue-600">Scanning...</p></>) : (<><span className="text-3xl mb-2">📄</span><p className="text-sm font-semibold text-gov-navy">Browse Files</p></>)}
                    </label>
                  </div>

                  <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[280px]">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-gov-navy">3. Non-ECR Proof</h3>
                      <p className="text-xs text-gray-500 mt-1">10th Pass Certificate or Higher</p>
                    </div>
                    <input type="file" id="upload-ecr" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileUpload(e, "ecr")} />
                    <label htmlFor="upload-ecr" className={`mt-auto border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${docs.ecr ? "bg-[#E6F4EA] border-[#137333] cursor-default" : isScanning.ecr ? "bg-blue-50 border-blue-300 cursor-wait" : "bg-white border-[#C8E0FF] hover:bg-blue-50 cursor-pointer"}`}>
                      {docs.ecr ? (<><span className="text-3xl mb-2">✅</span><p className="text-sm font-bold text-[#137333]">Verified</p></>) : isScanning.ecr ? (<><span className="text-3xl mb-2 animate-spin">⚙️</span><p className="text-sm font-bold text-blue-600">Scanning...</p></>) : (<><span className="text-3xl mb-2">📄</span><p className="text-sm font-semibold text-gov-navy">Browse Files</p></>)}
                    </label>
                  </div>
                </div>

                {/* NEW: DOCUMENT CONSISTENCY SCANNER */}
                {docs.address && docs.dob && (
                  <div className="bg-[#FFF4EA] border border-orange-200 p-6 rounded-2xl mb-8 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gov-navy">Document Consistency Scanner</h3>
                        <p className="text-sm text-gray-600">Cross-check your uploads for spelling mismatches before proceeding.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          setIsCheckingConsistency(true);
                          try {
                            const res = await fetch('/api/consistency', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                doc1Base64: docImages.address, doc1Type: "image/jpeg",
                                doc2Base64: docImages.dob, doc2Type: "image/jpeg"
                              })
                            });
                            const data = await res.json();
                            setConsistencyResult(data);
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsCheckingConsistency(false);
                          }
                        }}
                        className="bg-gov-orange text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-orange-500 transition-all"
                      >
                        {isCheckingConsistency ? "Scanning..." : "🔍 Run Cross-Check"}
                      </button>
                    </div>

                    {/* Show the Results */}
                    {consistencyResult && (
                      <div className={`p-4 rounded-xl border ${consistencyResult.isConsistent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <h4 className="font-bold mb-2">
                          {consistencyResult.isConsistent ? "✅ Perfect Match!" : "⚠️ Discrepancies Found"}
                        </h4>
                        {!consistencyResult.isConsistent && consistencyResult.discrepanciesFound && consistencyResult.discrepanciesFound.length > 0 && (
                          <ul className="list-disc pl-5 text-sm mb-3 text-red-700">
                            {consistencyResult.discrepanciesFound.map((err: string, i: number) => <li key={i}>{err}</li>)}
                          </ul>
                        )}
                        <p className="text-sm text-gray-800 font-semibold">
                          Recommendation: {consistencyResult.recommendation || "All documents are consistent and ready for verification."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end border-t border-gray-100 pt-8">
                  <button
                    onClick={() => setActiveTab("application")}
                    disabled={!canProceedToApp}
                    className={`font-bold rounded-xl px-10 py-4 shadow-lg flex items-center gap-3 transition-all ${canProceedToApp ? "bg-gov-navy text-white hover:bg-gov-navy/90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                  >
                    {isDemoMode && !allDocsUploaded
                      ? "Skip Upload (Demo Mode) →"
                      : "Proceed to Application Form →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PASSPORT APPLICATION */}
            {activeTab === "application" && (
              <div className="max-w-[1200px]">
                <h2 className="text-4xl font-extrabold text-gov-navy mb-8">Passport Type</h2>
                <div className="flex gap-12">
                  <div className="flex-1">
                    <div className="bg-[#FFF4EA] border border-orange-200 p-5 rounded-2xl mb-6 shadow-sm">
                      <h4 className="font-extrabold text-gov-navy text-sm uppercase tracking-wider mb-3">💡 Why a conversational form?</h4>
                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-700">
                        <div><strong className="block text-gov-orange mb-1">Zero Cognitive Overload</strong>No massive forms. The AI asks one simple human question at a time.</div>
                        <div><strong className="block text-gov-orange mb-1">Contextual Help</strong>Confused by a term like "Non-ECR"? Just ask the chat what it means.</div>
                        <div><strong className="block text-gov-orange mb-1">Error Prevention</strong>Validates answers instantly to prevent rejections at the passport office.</div>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] p-8 rounded-2xl border border-gray-100 h-[500px] flex flex-col">
                      <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`p-5 rounded-xl shadow-sm border border-gray-100 text-sm leading-relaxed ${msg.role === "ai" ? "bg-white text-gray-800" : "bg-[#FFF4EA] text-gov-navy ml-12 border-[#F49931]/30"}`}>
                            <span className="font-bold">{msg.role === "ai" ? "PassportGuide AI: " : "You: "}</span>
                            {msg.text}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleChatSubmit} className="mt-auto shrink-0">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your answer here..." className="w-full border border-gray-200 p-4 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gov-navy shadow-sm" />
                        <div className="flex gap-4 mt-4">
                          {isDemoMode && (
                            <button type="button" onClick={handleInstantFill} className="px-6 py-3 bg-[#FFF4EA] border border-orange-200 text-gov-orange font-bold rounded-xl text-sm hover:bg-orange-50 transition-colors">
                              ⚡ Instant Fill (Bypass)
                            </button>
                          )}
                          <button type="submit" disabled={isSubmitting} className="flex-1 bg-gov-navy text-white font-bold rounded-xl text-sm py-3 hover:bg-gov-navy/90">
                            {isSubmitting ? "Processing..." : "NEXT"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="w-[350px]">
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sticky top-0 max-h-[700px] flex flex-col">
                      <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Live Draft</h3>
                        {isReadyToBook(applicant) ? (<span className="bg-[#E6F4EA] text-[#137333] text-xs font-bold px-3 py-1 rounded-full">Ready</span>) : (<span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">In Progress</span>)}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 divide-y divide-gray-50 pr-2">
                        {draftFields.map((field, idx) => (
                          <div key={idx} className="pt-3 first:pt-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.label}</p>
                            <p className={`text-sm font-semibold mt-1 ${field.value ? "text-gray-800" : "text-gray-300"}`}>{field.value || "Waiting..."}</p>
                          </div>
                        ))}
                      </div>

                      <button disabled={!isReadyToBook(applicant)} onClick={() => setActiveTab("appointment")} className={`w-full py-4 mt-6 rounded-xl font-bold text-sm transition-all duration-300 shrink-0 ${isReadyToBook(applicant) ? "bg-gov-orange text-white shadow-lg" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                        Review PSK Slots & Fee
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: BOOK APPOINTMENT & PAYMENT */}
            {activeTab === "appointment" && (
              <div className="max-w-[900px]">
                <h2 className="text-4xl font-extrabold text-gov-navy mb-8">Book Appointment</h2>
                {!isBooked ? (
                  <div className="bg-[#F8FAFC] p-10 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="space-y-4 mb-10 pb-8 border-b border-gray-200">
                      <div className="grid grid-cols-3"><p className="text-sm text-gray-500 col-span-1">Application Ref Number</p><p className="text-sm font-bold text-gov-navy col-span-2">IND-2026-8849201</p></div>
                      <div className="grid grid-cols-3"><p className="text-sm text-gray-500 col-span-1">Given Name</p><p className="text-sm font-bold text-gov-navy col-span-2">{applicant.fullName}</p></div>
                      <div className="grid grid-cols-3"><p className="text-sm text-gray-500 col-span-1">Service Type</p><p className="text-sm font-bold text-gov-navy col-span-2">Fresh Passport</p></div>
                      <div className="grid grid-cols-3"><p className="text-sm text-gray-500 col-span-1">Total Fee</p><p className="text-sm font-bold text-gov-navy col-span-2">₹1,500.00</p></div>
                    </div>
                    <h3 className="text-lg font-bold text-gov-navy mb-4">1. Select Available Date (Pune PSK)</h3>
                    <div className="flex gap-4 mb-10">
                      {["Aug 28", "Aug 29", "Sept 02", "Sept 03"].map((date) => (
                        <button key={date} onClick={() => setSelectedDate(date)} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${selectedDate === date ? "border-gov-navy bg-gov-navy text-white shadow-md" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>{date}</button>
                      ))}
                    </div>
                    <h3 className="text-lg font-bold text-gov-navy mb-4">2. Select Payment Method</h3>
                    <div className="space-y-3 mb-10">
                      {["UPI (GPay, PhonePe)", "Debit / Credit Card", "Netbanking"].map((method) => (
                        <label key={method} className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedPayment === method ? "border-gov-orange bg-[#FFF4EA]" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
                          <input type="radio" name="payment" value={method} onChange={(e) => setSelectedPayment(e.target.value)} className="w-5 h-5 text-gov-orange focus:ring-gov-orange" />
                          <span className="font-semibold text-gray-800">{method}</span>
                        </label>
                      ))}
                    </div>
                    <button disabled={!selectedDate || !selectedPayment || isProcessing} onClick={() => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); setIsBooked(true); }, 2000); }} className={`w-full py-5 rounded-xl font-bold text-lg transition-all flex justify-center items-center gap-3 ${selectedDate && selectedPayment ? "bg-gov-navy text-white shadow-lg hover:bg-gov-navy/90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      {isProcessing ? (<span className="animate-spin text-2xl">⚙️</span>) : (`Pay ₹1,500 & Book Appointment`)}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#E6F4EA] border border-[#137333]/20 p-10 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-[#137333] text-white rounded-full flex items-center justify-center text-4xl mb-6 shadow-md">✓</div>
                    <h3 className="text-3xl font-extrabold text-[#137333] mb-2">Appointment Confirmed!</h3>
                    <p className="text-gray-700 text-lg mb-8">Your slot at Pune PSK is booked for <span className="font-bold">{selectedDate}</span>. An SMS has been sent to {applicant.mobile}.</p>
                    <button onClick={() => setActiveTab("track")} className="bg-white text-[#137333] border border-[#137333] font-bold rounded-xl px-10 py-4 hover:bg-green-50 transition-all shadow-sm">
                      Go to Application Tracker →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: TRACK APPLICATION & ESCALATION */}
            {activeTab === "track" && (
              <div className="max-w-[1000px]">
                <h2 className="text-4xl font-extrabold text-gov-navy mb-8">Track Application</h2>
                <div className="bg-[#F8FAFC] p-10 rounded-2xl border border-gray-100 shadow-sm flex gap-12">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gov-navy mb-8">Application Status</h3>
                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-10">
                      <div className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#137333] rounded-full border-4 border-[#F8FAFC]"></div>
                        <h4 className="font-bold text-gray-800">Application Submitted</h4>
                        <p className="text-sm text-gray-500">Form filled and fee paid successfully.</p>
                        <span className="text-xs font-bold text-[#137333] mt-1 block">Completed - {selectedDate || "Today"}</span>
                      </div>
                      <div className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#137333] rounded-full border-4 border-[#F8FAFC]"></div>
                        <h4 className="font-bold text-gray-800">PSK Appointment & Biometrics</h4>
                        <p className="text-sm text-gray-500">Documents verified at Passport Seva Kendra.</p>
                        <span className="text-xs font-bold text-[#137333] mt-1 block">Completed</span>
                      </div>
                      <div className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 bg-gov-orange rounded-full border-4 border-[#F8FAFC] animate-pulse shadow-[0_0_10px_rgba(244,153,49,0.5)]"></div>
                        <h4 className="font-bold text-gray-800">Police Verification</h4>
                        <p className="text-sm text-gray-500">Pending clearance from local police station.</p>
                        <span className="text-xs font-bold text-gov-orange mt-1 block">Delayed - Pending for 32 days</span>
                      </div>
                      <div className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 bg-gray-300 rounded-full border-4 border-[#F8FAFC]"></div>
                        <h4 className="font-bold text-gray-400">Passport Printing & Dispatch</h4>
                        <p className="text-sm text-gray-400">Awaiting police clearance to begin printing.</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-[350px]">
                    <div className="bg-[#FFF4EA] border border-orange-200 p-8 rounded-2xl shadow-sm sticky top-0">
                      <h3 className="text-lg font-extrabold text-gov-navy mb-2 flex items-center gap-2">
                        <span className="text-2xl">⚠️</span> Verification Delayed
                      </h3>
                      <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                        Your application has been stuck at the Police Verification stage for over 30 days. According to the Citizen's Charter, you are eligible to file an official grievance.
                      </p>
                      <button onClick={() => alert("Simulating: PassportGuide AI is drafting a CPGRAMS grievance letter with File Ref No. IND-2026-8849201...")} className="w-full bg-gov-orange text-white font-bold rounded-xl py-4 shadow-md hover:bg-orange-500 transition-all flex justify-center items-center gap-2">
                        <span>📝</span> Auto-Draft Grievance
                      </button>
                      <p className="text-[10px] text-gray-400 mt-4 text-center leading-tight">PassportGuide AI will format this perfectly for the CPGRAMS portal.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}