import { createServerFn } from "@tanstack/react-start";

async function callLovableAI(model: string, prompt: string, system?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export const generateProposal = createServerFn({ method: "POST" })
  .inputValidator((d: {
    type: "technical" | "financial";
    model: string;
    preparer: string;
    company: string;
    address: string;
    phone: string;
    docsText: string;
    extras?: string;
    withTips?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const roleDesc =
      data.type === "technical"
        ? "an expert bid writer producing a comprehensive TECHNICAL proposal that responds directly to the Terms of Reference (TOR). Cover: executive summary, understanding of assignment, methodology, work plan, team composition, company experience, quality assurance, and compliance matrix."
        : "an expert bid writer producing a detailed FINANCIAL proposal. Include: cover letter, price schedule table (line items with unit rates and totals), assumptions, payment schedule, validity period, and taxes.";

    const prompt = `Prepare a professional ${data.type} proposal in polished formal English.

Preparer: ${data.preparer}
Company: ${data.company}
Address: ${data.address}
Phone: ${data.phone}

TOR / Bid documents & attached content:
${data.docsText || "(no bid documents attached; produce a strong generic proposal based on best practices)"}

${data.extras ? `Additional guidance / quotation info:\n${data.extras}` : ""}

Write the full proposal now. Use clear section headings. Be specific, detailed, and persuasive.`;

    const content = await callLovableAI(data.model, prompt, `You are ${roleDesc}`);

    let winning_tips = "";
    if (data.withTips) {
      winning_tips = await callLovableAI(
        data.model,
        `Based on the proposal you just wrote and this brief:\n${data.docsText.slice(0, 4000)}\n\nGive 8 concrete, insider tips on how to WIN this specific contract. Numbered list, short and punchy.`,
        "You are a veteran procurement consultant.",
      );
    }
    return { content, winning_tips };
  });

export const summarizeBid = createServerFn({ method: "POST" })
  .inputValidator((d: { model: string; docsText: string }) => d)
  .handler(async ({ data }) => {
    const prompt = `Summarize this bid / tender document. Output sections:
1. What the client wants (2-3 lines)
2. Scope of work (bullets)
3. Mandatory requirements & eligibility (bullets)
4. Key deadlines
5. Evaluation criteria & weights
6. Documents I must submit (checklist)
7. Red flags / risks

Document:
${data.docsText.slice(0, 20000)}`;
    const summary = await callLovableAI(data.model, prompt, "You are a bid analyst. Be concise and structured.");
    return { summary };
  });
