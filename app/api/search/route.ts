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

    const systemPrompt = `You are an expert lead research assistant. Your task is to find REAL, verifiable business contact information.

IMPORTANT: You have access to your knowledge base which includes business directories, Google Maps data, industry databases, and web information up to your training date.

When searching for businesses:
1. Search using the EXACT query first
2. If limited results, try alternative searches:
   - Replace "agencies" with "agents", "brokers", "consultants", "advisors"
   - Use geography variations (city, county, metro area)
   - Try broader categories if specific ones fail
3. Extract REAL contact info from known businesses
4. Include phone numbers in proper US format: (XXX) XXX-XXXX
5. Include valid email domains
6. Return 5-20 leads if possible, minimum 1-3

Return ONLY this JSON (no markdown, no explanation):
[
  {
    "id": 1,
    "name": "Business/Person Name",
    "email": "contact@domain.com",
    "phone": "(555) 123-4567",
    "city": "City",
    "state": "FL",
    "zip": "12345",
    "website": "domain.com",
    "social": "linkedin.com/company/xxx",
    "businessType": "Category"
  }
]

If NO real results found, return: []`;

    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Find REAL business contact information for: "${searchQuery}"

Search strategy:
1. Exact search: "${searchQuery}"
2. Try these variations if needed:
   - ${searchQuery.replace(/agencies/gi, "agents")}
   - ${searchQuery.replace(/in /gi, "near ")}
   - ${searchQuery.split(" in ")[0]} professionals in ${searchQuery.split(" in ")[1] || "Florida"}

Find the MOST ACCURATE and REAL leads possible. Return ONLY JSON array.`,
        },
      ],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let leads = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      leads = JSON.parse(jsonString);

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
      message:
        leads.length === 0
          ? `No leads found for "${searchQuery}". Try a different search.`
          : `Found ${leads.length} leads`,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}