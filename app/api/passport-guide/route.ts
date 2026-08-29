import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Change to this:
    const { message, currentDraft, language } = await req.json();
    
    
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key in .env.local" }, { status: 500 });
    }

    // UPDATED PROMPT: Now includes all official MEA fields
    const prompt = `
    You are an official Indian Passport Application Guide.
    The user is filling out their passport form one conversational step at a time.
    
    Current Draft State:
    ${JSON.stringify(currentDraft, null, 2)}

    User's latest input: "${message}"

    Strict Instructions:
    1. Analyze the user's input. If it is gibberish, offensive, or clearly invalid, DO NOT extract it. 
    2. If invalid, your 'reply' must politely explain what went wrong and ask the question again.
    3. If valid, extract the relevant data into the 'extractedFields' object.
    4. Handle negatives gracefully: If they say "No" to aliases, set aliasName to "None". If they say "Same" for permanent address, copy the currentAddress. If they say "No" to criminal records, set criminalRecord to "None".
    5. Your 'reply' must ask for the NEXT missing field in this EXACT order: 
       fullName ➔ aliasName (ask if they have any) ➔ gender ➔ dob (ask for YYYY-MM-DD) ➔ placeOfBirth (Town, District, State) ➔ fatherName ➔ motherName ➔ spouseName (if married, else NA) ➔ mobile ➔ email ➔ currentAddress (with PIN) ➔ previousAddress (ask if they lived elsewhere in the past 1 year) ➔ permanentAddress ➔ education ➔ employmentType ➔ distinguishingMark ➔ criminalRecord.
    6. If all fields are complete, tell them the draft is ready and to click 'Review PSK Slots & Fee'.
    7. CRITICAL: Your 'reply' message MUST be translated into ${language || 'English'}. However, the 'extractedFields' JSON keys and values must always remain in English for the database.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                extractedFields: {
                  type: "OBJECT",
                  properties: {
                    fullName: { type: "STRING" },
                    aliasName: { type: "STRING" },
                    gender: { type: "STRING" },
                    dob: { type: "STRING" },
                    placeOfBirth: { type: "STRING" },
                    fatherName: { type: "STRING" },
                    motherName: { type: "STRING" },
                    spouseName: { type: "STRING" },
                    mobile: { type: "STRING" },
                    email: { type: "STRING" },
                    currentAddress: { type: "STRING" },
                    previousAddress: { type: "STRING" },
                    permanentAddress: { type: "STRING" },
                    education: { type: "STRING" },
                    employmentType: { type: "STRING" },
                    distinguishingMark: { type: "STRING" },
                    criminalRecord: { type: "STRING" }
                  }
                },
                reply: { type: "STRING" }
              },
              required: ["reply"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error [${response.status}]:`, errorText);

      if (response.status === 429) {
        return NextResponse.json({
          reply: "⚠️ Gemini free quota reached for this model. Please wait a short moment or click 'Instant Fill (Bypass)' to continue your application demo.",
          extractedFields: {}
        });
      }

      return NextResponse.json({ error: `Gemini API Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: "No content returned from Gemini" }, { status: 500 });
    }
    const responseData = JSON.parse(rawText);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}