"use strict";
/**
 * HUQUQ AI — Production Legal AI Pipeline v2
 *
 * Asosiy tuzatishlar:
 *  - Colloquial Uzbek parser (uzbekParser)
 *  - Complexity-based response format (plain/brief/structured)
 *  - Uzbek-first: hech qachon inglizcha sarlavhalar
 *  - Context validation: faqat user aytgan narsalar
 *  - Hallucination filter: o'ylab chiqarilgan bola/shaxs yo'q
 */

const Groq = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");

const { searchWeb, formatSearchContext } = require("./webSearch");
const { detectIntentAI, toUzCategory } = require("./intentDetector");
const {
  checkUserMessage,
  checkAIResponse,
  SAFETY_RESULT,
} = require("./safetyLayer");
const { validateAnswer } = require("./answerValidator");
const { selectModel } = require("./modelRouter");
const {
  buildConversationContext,
  extractLegalFacts,
  buildMemorySummary,
} = require("./conversationMemory");
const {
  detectDocumentType,
  buildDocumentSystemPrompt,
} = require("./documentGenerator");
const {
  parseUzbekIntent,
  getResponseFormat,
  QUESTION_COMPLEXITY,
} = require("./Uzbekparser");

// ── AI clients ────────────────────────────────────────────────
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ── Til aniqlash ──────────────────────────────────────────────
function detectLanguage(text = "") {
  if (/[а-яА-ЯёЁ]{3,}/u.test(text)) return "ru";
  if (/\b[a-zA-Z]{4,}\b/.test(text) && !/[а-яА-ЯёЁo'ʻ]/u.test(text))
    return "en";
  return "uz";
}

// ── System prompt — til va murakkablikka qarab ────────────────
function buildSystemPrompt({
  lang,
  category,
  webContext,
  memorySummary,
  responseFormat,
  uzbekIntent,
  hasSeriousCrime,
}) {
  // ── Til ko'rsatmasi ──
  const LANG_RULE =
    {
      uz: `MUHIM: Faqat O'ZBEK TILIDA yoz. Hech qanday inglizcha sarlavha, so'z yoki ibora ishlatma.
Lotin yoki kirill — foydalanuvchi qaysi alifboda yozsa, shunda javob ber.`,
      ru: `ВАЖНО: Отвечай ТОЛЬКО на РУССКОМ ЯЗЫКЕ. Никаких английских заголовков или фраз.`,
      en: `IMPORTANT: Respond ONLY in ENGLISH.`,
    }[lang] || `Faqat o'zbek tilida yoz.`;

  // ── Format ko'rsatmasi ──
  const FORMAT_RULE =
    {
      plain: `JAVOB FORMATI: Oddiy paragraf. Hech qanday emoji sarlavha, hech qanday "📌 Vaziyat" kabi tuzilma ishlatma.
Masalan:
"Agar sizni ko'chada urib ketishgan bo'lsa, ichki ishlar bo'limiga yoki prokuraturaga ariza berishingiz mumkin. Tan jarohati bo'lsa, tibbiy ma'lumotnomani saqlab qo'ying."`,

      brief: `JAVOB FORMATI: 2-3 qisqa paragraf. Faqat kerak bo'lsa bitta sarlavha ishlat.
Ortiqcha tuzilma, uzun ro'yxat, yoki inglizcha heading ISHLATMA.`,

      structured: `JAVOB FORMATI: Strukturalangan javob quyidagi bo'limlar bilan (faqat o'zbek tilida):
📌 Vaziyat: (qisqa xulosa)
⚖️ Huquqiy tahlil: (faqat tasdiqlangan qonunlarga asoslangan)
✅ Nima qilish kerak: (aniq qadamlar)
📍 Xulosa: (qisqa tavsiya)`,
    }[responseFormat] || `JAVOB FORMATI: Oddiy paragraf.`;

  // ── Intent hint ──
  const intentHint = uzbekIntent?.hasActions
    ? `Foydalanuvchi niyati: ${uzbekIntent.hints.join(", ")}.`
    : "";

  // ── Qonun konteksti ──
  const lawContext = webContext
    ? `\nTASHQI QONUN MANBALARI (faqat quyidagilardan foydalaning):\n${webContext}\n(Bu yerda yo'q bo'lgan modda raqamlarini O'YLAB CHIQARMA.)`
    : "\n[Ushbu so'rov uchun tasdiqlangan qonun manbasi topilmadi — aniq modda raqami keltirma]";

  // ── Memory ──
  const memNote = memorySummary ? `\nSuhbat konteksti: ${memorySummary}` : "";

  // ── Og'ir jinoyat ──
  const crimeNote = hasSeriousCrime
    ? `\nOGOHLANTIRISH: Og'ir jinoyat mavzusi. Jimlik huquqini (JPK 68) eslatib o't. Darhol advokat tavsiya qil.`
    : "";

  return `Siz O'zbekiston huquqi bo'yicha ixtisoslashgan AI huquqiy yordamchisiz.

${LANG_RULE}

QOIDA — NIMA QILMA:
1. Foydalanuvchi xabarida yo'q shaxslar, bolalar, qarindoshlar haqida hech narsa o'ylab chiqarma.
2. Inglizcha sarlavha (Situation, Legal Analysis, Steps, Conclusion) ISHLATMA.
3. Tasdiqlangan manbada yo'q modda raqamini KELTIRMA — "aniq modda tasdiqlanmagan" de.
4. Xalqaro yoki boshqa davlat qonunlarini tilga olma — faqat O'zbekiston.
5. Takroriy jumlalar yozma.

${intentHint}
Huquqiy soha: ${category !== "unknown" ? category : "aniqlanmadi"}

${FORMAT_RULE}
${crimeNote}
${memNote}
${lawContext}`;
}

// ── Groq ──────────────────────────────────────────────────────
async function callGroq(messages, model) {
  if (!groqClient) throw new Error("GROQ_API_KEY sozlanmagan");
  const resp = await groqClient.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 1500,
  });
  return resp.choices?.[0]?.message?.content?.trim() || "";
}

// ── Gemini ────────────────────────────────────────────────────
async function callGemini(
  systemPrompt,
  userMessage,
  history,
  imageBase64,
  imageMimeType,
) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY sozlanmagan");

  const contents = [];
  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "").slice(0, 600) }],
    });
  }

  const userParts = [];
  if (imageBase64) {
    userParts.push({
      inlineData: {
        mimeType: imageMimeType || "image/jpeg",
        data: imageBase64,
      },
    });
    userParts.push({
      text: `Ushbu huquqiy hujjat rasmini tahlil qil. Nomlar, sanalar, summalar, imzolar va hujjat turini aniqlang. Keyin javob ber: ${userMessage}`,
    });
  } else {
    userParts.push({ text: userMessage });
  }
  contents.push({ role: "user", parts: userParts });

  const resp = await geminiClient.models.generateContent({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 1500,
    },
    contents,
  });
  return resp.text?.trim() || "";
}

// ── Asosiy pipeline ───────────────────────────────────────────
async function getLegalAdvice(
  userMessage,
  history = [],
  imageBase64 = null,
  imageMimeType = "image/jpeg",
  lang = "uz",
) {
  const msg = String(userMessage || "")
    .trim()
    .slice(0, 2000);
  if (!msg) return { answer: "Xabar bo'sh.", category: "unknown" };

  const detectedLang = lang === "uz" ? detectLanguage(msg) : lang;

  // ── 1. Safety ─────────────────────────────────────────────
  const safetyResult = checkUserMessage(msg);
  if (safetyResult.status === SAFETY_RESULT.BLOCKED) {
    return { answer: safetyResult.message, category: "blocked" };
  }
  const hasSeriousCrime = safetyResult.status === SAFETY_RESULT.REDIRECTED;

  // ── 2. Colloquial Uzbek parsing ──────────────────────────
  const uzbekIntent = parseUzbekIntent(msg);
  const responseFormat = getResponseFormat(
    uzbekIntent.complexity,
    uzbekIntent.hasActions,
  );

  // ── 3. Intent detection ───────────────────────────────────
  const category = await detectIntentAI(msg);
  const uzCategory = toUzCategory(category);

  // ── 4. Document detection ─────────────────────────────────
  const isDoc =
    /ariza|shikoyat|da['']vo|shartnoma|petitsiya|bildirishnoma/i.test(msg);
  const docType = isDoc ? detectDocumentType(msg) : null;

  // ── 5. Law retrieval ──────────────────────────────────────
  let webContext = "";
  try {
    const q = `O'zbekiston ${category !== "unknown" ? category + " huquq" : "qonun"} ${msg.slice(0, 120)}`;
    webContext = formatSearchContext(await searchWeb(q, 3));
  } catch (e) {
    console.warn("Law retrieval skipped:", e.message);
  }

  // ── 6. Memory ─────────────────────────────────────────────
  const relevantHistory = buildConversationContext(history, msg);
  const memorySummary = buildMemorySummary(extractLegalFacts(history));

  // ── 7. Model selection ────────────────────────────────────
  const modelSel = selectModel({
    userMessage: msg,
    category,
    hasImage: !!imageBase64,
    historyLength: history.length,
  });

  // ── 8. System prompt ──────────────────────────────────────
  const systemPrompt = isDoc
    ? buildDocumentSystemPrompt(docType)
    : buildSystemPrompt({
        lang: detectedLang,
        category,
        webContext,
        memorySummary,
        responseFormat,
        uzbekIntent,
        hasSeriousCrime,
      });

  // ── 9. LLM call ───────────────────────────────────────────
  let rawAnswer = "";
  try {
    if (modelSel.provider === "gemini" && geminiClient) {
      rawAnswer = await callGemini(
        systemPrompt,
        msg,
        relevantHistory,
        imageBase64,
        imageMimeType,
      );
    } else {
      rawAnswer = await callGroq(
        [
          { role: "system", content: systemPrompt },
          ...relevantHistory,
          { role: "user", content: msg },
        ],
        modelSel.model,
      );
    }
  } catch (err) {
    console.warn("Primary LLM failed:", err.message);
    try {
      if (modelSel.provider === "gemini" && groqClient) {
        rawAnswer = await callGroq(
          [
            { role: "system", content: systemPrompt },
            ...relevantHistory,
            { role: "user", content: msg },
          ],
          "llama-3.3-70b-versatile",
        );
      } else if (geminiClient) {
        rawAnswer = await callGemini(
          systemPrompt,
          msg,
          relevantHistory,
          null,
          null,
        );
      } else {
        throw new Error("Barcha provayderlar ishlamayapti");
      }
    } catch (fe) {
      console.error("All LLMs failed:", fe.message);
      return {
        answer: "Texnik muammo. Iltimos, qayta urinib ko'ring.",
        category: uzCategory,
      };
    }
  }

  // Og'ir jinoyat ogohlantirish
  if (hasSeriousCrime) {
    const warn = {
      uz: "⚠️ Bu og'ir jinoyat mavzusi. Advokat bilan darhol maslahatlashing. Jimlik huquqingiz bor — tergov paytida advokatdan tashqari hech narsa aytmang.\n\n",
      ru: "⚠️ Это серьёзная уголовная тема. Немедленно проконсультируйтесь с адвокатом. Вы имеете право молчать.\n\n",
      en: "⚠️ This involves serious criminal matters. Consult a lawyer immediately. You have the right to remain silent.\n\n",
    };
    rawAnswer = (warn[detectedLang] || warn.uz) + rawAnswer;
  }

  // ── 10. Validate ──────────────────────────────────────────
  const { valid, text: finalAnswer } = validateAnswer(rawAnswer, {
    lang: detectedLang,
    userMessage: msg,
  });

  if (!valid) {
    return {
      answer:
        "Javob yaratishda xatolik. Savolingizni boshqacha ifodalab ko'ring.",
      category: uzCategory,
    };
  }

  // ── 11. Response safety check ─────────────────────────────
  const check = checkAIResponse(finalAnswer);
  if (!check.safe) {
    return {
      answer:
        "Bu mavzu bo'yicha malakali advokat bilan maslahatlashingizni tavsiya etamiz.",
      category: uzCategory,
    };
  }

  return { answer: finalAnswer, category: uzCategory };
}

module.exports = { getLegalAdvice };
