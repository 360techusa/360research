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

    const systemPrompt = `You are a lead research assistant. Your job is to SEARCH THE INTERNET for REAL business contact information.

When given a search query:
1. Search for the exact query first
2. If no results, try alternative searches (e.g., "insurance agents", "brokers", "advisors")
3. Extract REAL contact information from search results
4. Verify data looks realistic (real phone formats, real domains)
5. Return 3-10 leads if available, 0-5 if limited

Return ONLY this JSON format (no markdown, no explanation):
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

If NO results found after all search attempts, return empty array: []`;

    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      tools: [
        {
          type: "web_search",
          name: "web_search",
        },
      ],
      messages: [
        {
          role: "user",
          content: `Search the internet for: "${searchQuery}"
          
Try these search variations if needed:
1. Exact search: "${searchQuery}"
2. Alternative: "${searchQuery.replace(/in /g, "near ")}"
3. Alternative: Replace category with synonyms (agents, brokers, advisors, consultants)

Find and extract REAL contact information from actual businesses/websites. Return ONLY JSON array.`,
        },
      ],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
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
      leads: leads.length > 0 ? leads : [],
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