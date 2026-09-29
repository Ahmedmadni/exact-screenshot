const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTENTS = [
  "Cover","Agenda","Executive Summary","Section Divider","Big Number","Problem","Solution","Opportunity",
  "Comparison","Timeline","Process","Roadmap","Portfolio","Dashboard","Data Story","Financial","Quote",
  "Case Study","Before / After","Team","Call to Action","Closing",
];
const VISUALS = [
  "Hero Image","Cards","Icon Grid","Timeline","Process","Diagram","Matrix","Chart","KPI Cards","Comparison",
  "Illustration","Table","Before / After","Big Number","Minimal Text","Image + Text","Full Bleed Image",
];

function promptFor(body: any) {
  const base = `You are the presentation architect for a professional boardroom presentation product.
Return JSON only. Do not wrap JSON in markdown.
Never invent financial figures, market statistics, case studies, dates, named customers, or factual claims that are not supplied by the user.
If a quantitative value is not supplied, use a descriptive KPI label rather than a fabricated number.
Use the requested presentation language. Arabic must be natural professional Arabic, not translated word-for-word.
Valid slideIntent values: ${INTENTS.join(", ")}.
Valid visualType values: ${VISUALS.join(", ")}.
Keep slide headlines insight-led and concise. Bullets should be specific and presentation-ready.
Do not produce x/y coordinates; layout is handled by a separate engine.`;

  if (body.operation === "createPlan") {
    return `${base}
Create a complete presentation plan for this request:
${JSON.stringify(body.request)}
Return exactly:
{
  "brief": {
    "title": string,
    "objective": string,
    "coreMessage": string,
    "recommendedSlideCount": number,
    "estimatedDuration": number,
    "visualDirection": string
  },
  "storyArc": [{"id": string, "label": string, "question": string}],
  "slides": [{
    "slideNumber": number,
    "sortOrder": number,
    "title": string,
    "purpose": string,
    "slideIntent": string,
    "keyMessage": string,
    "contentSummary": string,
    "visualType": string,
    "isOptional": boolean,
    "bullets": [string],
    "kpis": [string],
    "layoutId": string
  }]
}
Generate approximately ${body.request?.slideCount ?? 10} slides. Prefer these layoutId values when relevant:
cover-minimal, cover-split, cover-bold, section-divider, title-content, image-text, three-cards, four-cards, kpi-metrics, timeline, comparison, big-number, closing-cta.`;
  }

  if (body.operation === "rewriteSlide") {
    return `${base}
Rewrite one slide using action "${body.action}".
Presentation request: ${JSON.stringify(body.request)}
Current slide: ${JSON.stringify(body.slide)}
Return only one slide object with the same field shape as the current slide.
Preserve the slide intent unless the current intent is clearly incompatible. Preserve factual meaning. For "shorten", reduce density. For "executive", strengthen the takeaway. For "regenerate", create a fresh expression without inventing facts.`;
  }

  if (body.operation === "coachSlide") {
    return `${base}
Create presenter notes and coaching for this slide.
Presentation request: ${JSON.stringify(body.request)}
Current slide: ${JSON.stringify(body.slide)}
Next slide: ${JSON.stringify(body.next ?? null)}
Return exactly:
{
  "talkTrack": string,
  "keyPoints": [string],
  "transition": string,
  "anticipatedQuestions": [string],
  "coachTips": [string],
  "sourceReminders": [string],
  "estimatedSeconds": number
}
Requirements:
- The talk track should sound natural when spoken, not like slide copy.
- Do not invent evidence or figures.
- If the slide contains evidenceRefs, remind the presenter of the exact source names/locators.
- Anticipated questions should reflect the requested audience.
- Keep the talk track concise enough for 30–180 seconds unless the slide genuinely requires more explanation.`;
  }

  return `${base}
Reflow the presentation outline using action "${body.action}".
Presentation request: ${JSON.stringify(body.request)}
Current slides: ${JSON.stringify(body.current)}
Return only a JSON array of slide objects with the same field shape.
For "shorten", remove lower-value optional slides while preserving the decision narrative.
For "expand", add useful missing sections rather than filler.
For "regenerate", rebuild the outline while preserving the user's objective.`;
}

function extractText(payload: any): string | null {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  });
  if (!userResponse.ok) {
    return new Response(JSON.stringify({ error: "Sign in before using AI generation." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const input = promptFor(body);
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-luna";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("OpenAI error", response.status, payload);
      return new Response(JSON.stringify({ error: "AI provider request failed." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = extractText(payload);
    if (!text) throw new Error("AI response did not contain text.");
    const result = JSON.parse(text);

    return new Response(JSON.stringify({ result, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "AI generation failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
