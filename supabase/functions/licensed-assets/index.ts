const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader || !supabaseUrl || !supabaseAnonKey) return false;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  });
  return response.ok;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function pexelsRequest(path: string) {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) throw new Error("PEXELS_API_KEY is not configured.");
  const response = await fetch("https://api.pexels.com" + path, {
    headers: { Authorization: key },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error ?? "Licensed media provider request failed.");
  return payload;
}

async function searchPexels(body: any) {
  const query = String(body.query ?? "").trim();
  if (query.length < 2) throw new Error("Search query is too short.");
  const page = Math.max(1, Math.min(100, Number(body.page ?? 1) || 1));
  const perPage = Math.max(8, Math.min(40, Number(body.perPage ?? 24) || 24));
  const orientation = ["landscape", "portrait", "square"].includes(body.orientation) ? body.orientation : undefined;
  const params = new URLSearchParams({
    query,
    page: String(page),
    per_page: String(perPage),
  });
  if (orientation) params.set("orientation", orientation);

  const payload = await pexelsRequest("/v1/search?" + params.toString());
  return {
    provider: "pexels",
    page: payload.page ?? page,
    perPage: payload.per_page ?? perPage,
    totalResults: payload.total_results ?? 0,
    results: (payload.photos ?? []).map((photo: any) => ({
      id: String(photo.id),
      provider: "pexels",
      title: String(photo.alt || query),
      creator: String(photo.photographer || ""),
      width: Number(photo.width || 0),
      height: Number(photo.height || 0),
      previewUrl: String(photo.src?.medium || photo.src?.small || ""),
      sourceUrl: String(photo.url || ""),
    })),
  };
}

async function importPexels(body: any) {
  const id = String(body.id ?? "").trim();
  if (!/^\d+$/.test(id)) throw new Error("Invalid media id.");
  const photo = await pexelsRequest("/v1/photos/" + encodeURIComponent(id));
  const mediaUrl = String(photo.src?.large2x || photo.src?.large || photo.src?.original || "");
  if (!mediaUrl.startsWith("https://images.pexels.com/")) throw new Error("Unexpected media host.");

  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Could not import the selected image.");
  const type = response.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error("Provider returned an unsupported file.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Selected media is too large to import.");

  return {
    provider: "pexels",
    id: String(photo.id),
    title: String(photo.alt || "Licensed photo"),
    creator: String(photo.photographer || ""),
    width: Number(photo.width || 0),
    height: Number(photo.height || 0),
    sourceUrl: String(photo.url || ""),
    mimeType: type,
    dataUrl: `data:${type};base64,${bytesToBase64(bytes)}`,
    licenseLabel: Deno.env.get("PEXELS_LICENSE_LABEL") || undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await requireUser(req))) return json({ error: "Authentication required." }, 401);

  try {
    const body = await req.json();
    const provider = String(body.provider ?? "pexels");
    if (provider !== "pexels") return json({ error: "Unsupported provider." }, 400);

    if (body.operation === "search") return json({ result: await searchPexels(body) });
    if (body.operation === "import") return json({ result: await importPexels(body) });

    return json({ error: "Unsupported operation." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Licensed media request failed." }, 500);
  }
});
