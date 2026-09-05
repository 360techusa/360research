import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query, searchMode, structured } = await request.json();

    let searchQuery = query;
    if (searchMode === "structured" && structured.campaignName) {
      searchQuery = `${structured.businessType} in ${structured.geography}${
        structured.companySize ? " (" + structured.companySize + ")" : ""
      }`;
    }

    if (!searchQuery.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a lead research assistant. When given a search query, find and extract business contact information.
    
Return EXACTLY this JSON format with 3-5 leads (no markdown, just JSON):
[
  {
    "id": 1,
    "name": "Company/Person Name",
    "email": "contact@company.com",
    "phone": "(555) 123-4567",
    "city": "City",
    "state": "ST",
    "zip": "12345",
    "website": "company.com",
    "social": "linkedin.com/company/xxx",
    "businessType": "Category"
  }
]

Be specific and realistic. Extract real-looking data based on the search query.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Search for: ${searchQuery}. Find and return contact information for businesses/people matching this search. Return ONLY valid JSON array, no other text.`,
        },
      ],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let leads = [];
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      leads = JSON.parse(jsonString);

      // Add IDs and businessType if missing
leads = leads.map((lead: any, idx: number) => ({
        id: Date.now() + idx,
        businessType: structured?.businessType || "General",
        campaign: structured?.campaignName || "Uncategorized",
        status: "New",
        dateFound: new Date().toLocaleDateString(),
        notes: "",
        ...lead,
      }));
    } catch (e) {
      console.error("Failed to parse leads:", e);
      leads = [];
    }

    return NextResponse.json({
      success: true,
      leads,
      query: searchQuery,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}