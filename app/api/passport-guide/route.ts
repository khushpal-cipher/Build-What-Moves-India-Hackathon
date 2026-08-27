import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, currentDraft } = await req.json();
    
    // Explicitly grab the key and clean it
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    
    // DEBUG: This will print in your VS Code terminal so we know it loaded!
    console.log("🔑 API Key Status: ", apiKey ? `Loaded (Starts with ${apiKey.substring(0, 5)}...)` : "MISSING!");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key in .env.local" }, { status: 500 });
    }

    const prompt = `
    You are an official Indian Passport Application Guide.
    The user is filling out their passport form one conversational step at a time.
    
    Current Draft State:
    ${JSON.stringify(currentDraft, null, 2)}

    User's latest input: "${message}"

    Strict Instructions:
    1. Analyze the user's input. If it is gibberish (e.g., "asdfgh"), offensive, or clearly invalid for a passport form, DO NOT extract it. 
    2. If invalid, your 'reply' must politely explain what went wrong and ask the question again.
    3. If valid, extract the relevant data into the 'extractedFields' object.
    4. Your 'reply' must then ask for the NEXT missing field in this exact order: 
       fullName ➔ dob (ask for YYYY-MM-DD format) ➔ email ➔ mobile ➔ parentName ➔ currentAddress ➔ permanentAddress.
    5. If they are providing their permanent address and say "Same", copy the currentAddress.
    6. If all fields are complete, tell them the draft is ready and to click 'Review PSK Slots & Fee'.
    `;

    // Direct REST API Call using the Secure Header Method
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey, // Securely passing the key here instead of the URL
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
                    dob: { type: "STRING" },
                    email: { type: "STRING" },
                    mobile: { type: "STRING" },
                    parentName: { type: "STRING" },
                    currentAddress: { type: "STRING" },
                    permanentAddress: { type: "STRING" }
                  }
                },
                reply: { 
                  type: "STRING", 
                  description: "Your conversational response to the user." 
                }
              },
              required: ["reply"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google REST API Error:", errorData);
      throw new Error("Failed to fetch from Gemini REST API");
    }

    const data = await response.json();
    
    // Parse the JSON string that Gemini returns inside the text block
    const rawText = data.candidates[0].content.parts[0].text;
    const responseData = JSON.parse(rawText);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" }, 
      { status: 500 }
    );
  }
}