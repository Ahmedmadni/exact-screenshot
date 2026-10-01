const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Orientation = "landscape" | "portrait" | "square";

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

function requestShape(body: any) {
  const query = String(body.query ?? "").trim().slice(0, 100);
  if (query.length < 2) throw new Error("Search query is too short.");
  const page = Math.max(1, Math.min(100, Number(body.page ?? 1) || 1));
  const perPage = Math.max(8, Math.min(40, Number(body.perPage ?? 24) || 24));
  const orientation = ["landscape", "portrait", "square"].includes(body.orientation)
    ? body.orientation as Orientation
    : undefined;
  return { query, page, perPage, orientation };
}

function serviceHeaders() {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return key
    ? {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      }
    : null;
}

async function cachedSearch<T>(cacheKey: string): Promise<T | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!supabaseUrl || !headers) return null;
  const params = new URLSearchParams({
    select: "payload",
    cache_key: `eq.${cacheKey}`,
    expires_at: `gt.${new Date().toISOString()}`,
    limit: "1",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/licensed_asset_search_cache?${params.toString()}`, { headers });
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows[0]?.payload ? rows[0].payload as T : null;
}

async function putSearchCache(cacheKey: string, provider: string, payload: unknown, hours: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!supabaseUrl || !headers) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/licensed_asset_search_cache?on_conflict=cache_key`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      cache_key: cacheKey,
      provider,
      payload,
      expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) console.error("licensed asset cache write failed", response.status, await response.text());
}

async function pexelsRequest(path: string) {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) throw new Error("PEXELS_API_KEY is not configured.");
  const response = await fetch("https://api.pexels.com" + path, {
    headers: { Authorization: key },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error ?? "Pexels request failed.");
  return payload;
}

async function searchPexels(body: any) {
  const { query, page, perPage, orientation } = requestShape(body);
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
  if (!/^\d+$/.test(id)) throw new Error("Invalid Pexels media id.");
  const photo = await pexelsRequest("/v1/photos/" + encodeURIComponent(id));
  const mediaUrl = String(photo.src?.large2x || photo.src?.large || photo.src?.original || "");
  if (!mediaUrl.startsWith("https://images.pexels.com/")) throw new Error("Unexpected Pexels media host.");

  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Could not import the selected Pexels image.");
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

async function pixabayRequest(params: URLSearchParams) {
  const key = Deno.env.get("PIXABAY_API_KEY");
  if (!key) throw new Error("PIXABAY_API_KEY is not configured.");
  params.set("key", key);
  const response = await fetch("https://pixabay.com/api/?" + params.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Pixabay request failed.");
  return JSON.parse(text);
}

async function searchPixabay(body: any) {
  const { query, page, perPage, orientation } = requestShape(body);
  const cacheKey = ["pixabay", query.toLowerCase(), orientation ?? "all", page, perPage].join("|");
  const cached = await cachedSearch<any>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage),
    image_type: "photo",
    safesearch: "true",
    order: "popular",
  });
  if (orientation === "landscape") params.set("orientation", "horizontal");
  if (orientation === "portrait") params.set("orientation", "vertical");

  const payload = await pixabayRequest(params);
  const result = {
    provider: "pixabay",
    page,
    perPage,
    totalResults: payload.totalHits ?? payload.total ?? 0,
    results: (payload.hits ?? []).map((photo: any) => ({
      id: String(photo.id),
      provider: "pixabay",
      title: String(photo.tags || query),
      creator: String(photo.user || ""),
      width: Number(photo.imageWidth || photo.webformatWidth || 0),
      height: Number(photo.imageHeight || photo.webformatHeight || 0),
      previewUrl: String(photo.webformatURL || photo.previewURL || ""),
      sourceUrl: String(photo.pageURL || ""),
    })),
  };
  // Pixabay requires API requests to be cached for 24 hours.
  await putSearchCache(cacheKey, "pixabay", result, 24);
  return result;
}

async function importPixabay(body: any) {
  const id = String(body.id ?? "").trim();
  if (!/^\d+$/.test(id)) throw new Error("Invalid Pixabay media id.");
  const payload = await pixabayRequest(new URLSearchParams({ id }));
  const photo = payload.hits?.[0];
  if (!photo) throw new Error("Pixabay media was not found.");

  const mediaUrl = String(photo.largeImageURL || photo.webformatURL || "");
  if (!mediaUrl.startsWith("https://pixabay.com/") && !mediaUrl.startsWith("https://cdn.pixabay.com/")) {
    throw new Error("Unexpected Pixabay media host.");
  }
  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Could not import the selected Pixabay image.");
  const type = response.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error("Provider returned an unsupported file.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Selected media is too large to import.");

  return {
    provider: "pixabay",
    id: String(photo.id),
    title: String(photo.tags || "Licensed photo"),
    creator: String(photo.user || ""),
    width: Number(photo.imageWidth || photo.webformatWidth || 0),
    height: Number(photo.imageHeight || photo.webformatHeight || 0),
    sourceUrl: String(photo.pageURL || ""),
    mimeType: type,
    dataUrl: `data:${type};base64,${bytesToBase64(bytes)}`,
    licenseLabel: Deno.env.get("PIXABAY_LICENSE_LABEL") || "Pixabay Content License",
  };
}

function interleave<T>(groups: T[][]) {
  const out: T[] = [];
  const max = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < max; index++) {
    for (const group of groups) {
      if (group[index]) out.push(group[index]!);
    }
  }
  return out;
}

async function searchAll(body: any) {
  const searches: Array<Promise<any>> = [];
  if (Deno.env.get("PEXELS_API_KEY")) searches.push(searchPexels(body));
  if (Deno.env.get("PIXABAY_API_KEY")) searches.push(searchPixabay(body));
  if (!searches.length) throw new Error("No licensed media provider is configured.");

  const settled = await Promise.allSettled(searches);
  const successful = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
  if (!successful.length) {
    const firstFailure = settled.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    throw firstFailure?.reason instanceof Error ? firstFailure.reason : new Error("Licensed media search failed.");
  }
  return {
    provider: "all",
    providers: successful.map((item) => item.provider),
    page: successful[0]?.page ?? 1,
    perPage: successful.reduce((sum, item) => sum + Number(item.perPage ?? 0), 0),
    totalResults: successful.reduce((sum, item) => sum + Number(item.totalResults ?? 0), 0),
    results: interleave(successful.map((item) => item.results ?? [])),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await requireUser(req))) return json({ error: "Authentication required." }, 401);

  try {
    const body = await req.json();
    const provider = String(body.provider ?? "all");

    if (body.operation === "search") {
      if (provider === "all") return json({ result: await searchAll(body) });
      if (provider === "pexels") return json({ result: await searchPexels(body) });
      if (provider === "pixabay") return json({ result: await searchPixabay(body) });
      return json({ error: "Unsupported provider." }, 400);
    }

    if (body.operation === "import") {
      if (provider === "pexels") return json({ result: await importPexels(body) });
      if (provider === "pixabay") return json({ result: await importPixabay(body) });
      return json({ error: "Choose a concrete provider before importing." }, 400);
    }

    return json({ error: "Unsupported operation." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Licensed media request failed." }, 500);
  }
});
