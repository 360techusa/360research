import { NextRequest, NextResponse } from "next/server";

interface Lead {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  social: string;
  businessType: string;
  campaign: string;
  status: string;
  dateFound: string;
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const { leads } = await request.json();

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    const apiKey = process.env.LIVE360_API_KEY;
    const groupId = process.env.LIVE360_GROUP_ID;
    const baseUrl = "https://api.live360.us";

    if (!apiKey || !groupId) {
      return NextResponse.json(
        { error: "Missing Live360 configuration" },
        { status: 500 }
      );
    }

    const results: any[] = [];

    for (const lead of leads) {
      try {
        // 1. Verificar si el contacto existe
        const checkResponse = await fetch(
          `${baseUrl}/contacts/exist?email=${encodeURIComponent(lead.email)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const checkData = await checkResponse.json();
        let contactId = checkData.id;

        // 2. Si no existe, crearlo
        if (!checkData.exists) {
          const createResponse = await fetch(`${baseUrl}/contacts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: lead.email,
              name: lead.name,
              phone: lead.phone,
              city: lead.city,
              state: lead.state,
              zip: lead.zip,
              website: lead.website,
              businessType: lead.businessType,
              notes: `${lead.notes} | Found: ${lead.dateFound}`,
            }),
          });

          const createData = await createResponse.json();
          contactId = createData.id;

          if (!createResponse.ok) {
            throw new Error(createData.message || "Failed to create contact");
          }
        }

        // 3. Agregar al grupo
        const groupResponse = await fetch(`${baseUrl}/groups/manage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId: groupId,
            contactId: contactId,
            action: "add",
          }),
        });

        const groupData = await groupResponse.json();

        if (!groupResponse.ok) {
          throw new Error(groupData.message || "Failed to add to group");
        }

        results.push({
          lead: lead.name,
          email: lead.email,
          success: true,
          message: "Added to Live360",
        });
      } catch (error: any) {
        results.push({
          lead: lead.name,
          email: lead.email,
          success: false,
          message: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: leads.length,
      results,
    });
  } catch (error) {
    console.error("Live360 API Error:", error);
    return NextResponse.json(
      { error: "Failed to process contacts" },
      { status: 500 }
    );
  }
}