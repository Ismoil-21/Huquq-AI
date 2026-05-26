"use strict";

const SEARCH_TIMEOUT_MS = 10000;

/**
 * Qonunchilik manbalari: lex.uz + Wikipedia + DuckDuckGo
 */
async function searchWeb(query, maxResults = 5) {
  const q = String(query || "").trim().slice(0, 200);
  if (!q) return [];

  const [lexResults, ddg, wiki] = await Promise.allSettled([
    searchLexUz(q),
    searchDuckDuckGo(`O'zbekiston ${q} qonun huquq`),
    searchWikipedia(q),
  ]);

  const results = [];
  const seen = new Set();

  // lex.uz — eng muhim manba
  for (const batch of [lexResults, ddg, wiki]) {
    if (batch.status !== "fulfilled") continue;
    for (const item of batch.value) {
      const key = (item.url || item.snippet).slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }

  return results.slice(0, maxResults);
}

/**
 * lex.uz — O'zbekiston qonunchilik bazasi
 * Rasmiy qonunlar portali
 */
async function searchLexUz(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    // lex.uz qidiruv API si
    const searchUrl = `https://lex.uz/search?q=${encodeURIComponent(query)}&lang=uz`;

    const resp = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":  "Mozilla/5.0 (compatible; HuquqAI/2.0)",
        "Accept":      "text/html,application/xhtml+xml",
        "Accept-Language": "uz,ru;q=0.9",
      },
    });

    if (!resp.ok) return [];

    const html = await resp.text();
    const results = parseLexUzResults(html, query);
    return results;
  } catch (err) {
    console.warn("lex.uz search:", err.message);
    // lex.uz ishlamasa — og'ir qidiruvni sinab ko'rish
    return await searchLexUzDirect(query).catch(() => []);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * lex.uz HTML natijalarini parse qilish
 */
function parseLexUzResults(html, query) {
  const results = [];

  // <a href="/docs/..."> shaklida documentlar
  const docPattern = /href="(\/docs\/[^"]+)"\s*[^>]*>([^<]{5,100})<\/a>/g;
  const snippetPattern = /class="[^"]*result[^"]*"[^>]*>([\s\S]{20,300}?)<\/div>/gi;

  let docMatch;
  while ((docMatch = docPattern.exec(html)) !== null && results.length < 4) {
    const url = `https://lex.uz${docMatch[1]}`;
    const title = docMatch[2].trim().replace(/\s+/g, " ");
    if (title.length > 5) {
      results.push({
        title,
        snippet: `Lex.uz — O'zbekiston Respublikasi qonunchilik bazasidan: ${title}`,
        url,
        source: "lex.uz",
      });
    }
  }

  // Agar hech narsa topilmasa — lex.uz uchun to'g'ridan qidirish
  if (results.length === 0) {
    results.push({
      title: "Lex.uz — Qonunchilik bazasi",
      snippet: `O'zbekiston Respublikasi qonunchilik bazasida "${query}" bo'yicha ma'lumot topish uchun lex.uz ga kiring`,
      url: `https://lex.uz/search?q=${encodeURIComponent(query)}`,
      source: "lex.uz",
    });
  }

  return results;
}

/**
 * lex.uz specific documents qidirish (to'g'ridan)
 */
async function searchLexUzDirect(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    // Qonun nomini aniqlash va to'g'ri URL qurish
    const lawKeywords = {
      "mehnat": { url: "https://lex.uz/docs/-161439", name: "Mehnat kodeksi" },
      "oila":   { url: "https://lex.uz/docs/-111372", name: "Oila kodeksi" },
      "yer":    { url: "https://lex.uz/docs/-111959", name: "Yer kodeksi" },
      "jinoy":  { url: "https://lex.uz/docs/-111453", name: "Jinoyat kodeksi" },
      "civil|fuqarolik|meros": { url: "https://lex.uz/docs/-111181", name: "Fuqarolik kodeksi" },
      "istemolchi|konsumer":   { url: "https://lex.uz/docs/5325977", name: "Iste'molchilar huquqlari to'g'risidagi qonun" },
      "soliq|tax":             { url: "https://lex.uz/docs/4674617", name: "Soliq kodeksi" },
    };

    const qLow = query.toLowerCase();
    for (const [keywords, lawInfo] of Object.entries(lawKeywords)) {
      if (keywords.split("|").some((kw) => qLow.includes(kw))) {
        return [{
          title:  lawInfo.name,
          snippet: `Lex.uz rasmiy manba: ${lawInfo.name} — O'zbekiston Respublikasining amaldagi qonunchiligi`,
          url:    lawInfo.url,
          source: "lex.uz",
        }];
      }
    }

    return [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGo(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MeningHuquqim/2.0" },
    });
    if (!resp.ok) return [];

    const data = await resp.json();
    const out = [];

    if (data.AbstractText) {
      out.push({
        title:   data.Heading || "DuckDuckGo",
        snippet: data.AbstractText.slice(0, 500),
        url:     data.AbstractURL || "",
        source:  "web",
      });
    }

    const topics = data.RelatedTopics || [];
    for (const t of topics) {
      if (out.length >= 3) break;
      if (t.Text) {
        out.push({
          title:   "Bog'liq ma'lumot",
          snippet: t.Text.slice(0, 400),
          url:     t.FirstURL || "",
          source:  "web",
        });
      }
    }

    return out;
  } catch (err) {
    console.warn("DuckDuckGo search:", err.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchWikipedia(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const searchUrl =
      `https://uz.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query + " qonun")}&srlimit=2&format=json&origin=*`;

    const resp = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "MeningHuquqim/2.0" },
    });
    if (!resp.ok) return [];

    const data = await resp.json();
    const hits = data?.query?.search || [];
    if (!hits.length) return [];

    const out = [];
    for (const hit of hits.slice(0, 2)) {
      const title   = hit.title;
      const pageUrl = `https://uz.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

      let snippet = (hit.snippet || "").replace(/<[^>]+>/g, "").trim();
      try {
        const extractUrl =
          `https://uz.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1` +
          `&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
        const exResp = await fetch(extractUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "MeningHuquqim/2.0" },
        });
        if (exResp.ok) {
          const exData = await exResp.json();
          const pages = exData?.query?.pages || {};
          const page  = Object.values(pages)[0];
          if (page?.extract) snippet = page.extract.slice(0, 400);
        }
      } catch {}

      if (snippet) out.push({ title, snippet, url: pageUrl, source: "wikipedia" });
    }

    return out;
  } catch (err) {
    console.warn("Wikipedia search:", err.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function formatSearchContext(results) {
  if (!results.length) return "";
  return results
    .map((r, i) => {
      const src    = r.source === "lex.uz" ? " [Lex.uz — rasmiy qonun manba]" : (r.url ? ` (${r.url})` : "");
      const prefix = r.source === "lex.uz" ? "📖 LEX.UZ" : `${i + 1}.`;
      return `${prefix} [${r.title}]${src}\n${r.snippet}`;
    })
    .join("\n\n");
}

module.exports = { searchWeb, formatSearchContext, searchLexUzDirect };
