"use strict";
/**
 * HUQUQ AI — Production Legal AI Pipeline
 *
 * Architecture:
 *   User Message
 *     → Safety Check (safetyLayer)
 *     → Intent Detection (intentDetector)
 *     → Web Search / Law Retrieval (webSearch)
 *     → Model Selection (modelRouter)
 *     → Conversation Memory (conversationMemory)
 *     → System Prompt (retrieval-first)
 *     → LLM (Gemini / Groq)
 *     → Answer Validation (answerValidator)
 *     → Safety Response Check
 *     → Final Answer
 */

const Groq          = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");

const { searchWeb, formatSearchContext } = require("./webSearch");
const { detectIntentAI, toUzCategory }   = require("./intentDetector");
const { checkUserMessage, checkAIResponse, SAFETY_RESULT } = require("./safetyLayer");
const { validateAnswer }                 = require("./answerValidator");
const { selectModel }                    = require("./modelRouter");
const { buildConversationContext, extractLegalFacts, buildMemorySummary } = require("./conversationMemory");
const { detectDocumentType, buildDocumentSystemPrompt } = require("./documentGenerator");

// ── AI clients ────────────────────────────────────────────────
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ── Language detection ────────────────────────────────────────
function detectLanguage(text = "") {
  if (/[а-яА-ЯёЁ]{3,}/u.test(text)) return "ru";
  if (/[a-zA-Z]{3,}/.test(text) && !/[а-яА-ЯёЁа-яА-Яа-яА-Я]/u.test(text)) return "en";
  return "uz";
}

function buildLangInstruction(lang) {
  const rules = {
    uz: "Faqat o'zbek tilida javob ber. Agar foydalanuvchi lotin alifbosida yozgan bo'lsa — lotin alifbosida, kiril bo'lsa — kirilda.",
    ru: "Отвечай только на русском языке.",
    en: "Respond only in English.",
  };
  return rules[lang] || rules.uz;
}

// ── Core System Prompt (Retrieval-First) ─────────────────────
function buildSystemPrompt({ lang, category, webContext, memorySummary, isDocument, docType, hasSeriousCrime, criminalGuidance }) {
  const langInstruction = buildLangInstruction(lang);

  const retrievedLaws = webContext
    ? `\n\n════ RETRIEVED LEGAL CONTEXT ════\n${webContext}\n(Use ONLY this retrieved information for legal references. DO NOT add article numbers not found here.)\n════════════════════════════════`
    : "\n\n[No verified law sources retrieved for this query]";

  const memorySection = memorySummary
    ? `\n\n${memorySummary}`
    : "";

  const criminalSection = hasSeriousCrime
    ? `\n\nSERIOUS CRIME DETECTED — MANDATORY GUIDANCE:
- Explain legal consequences clearly
- Mention right to remain silent (JPK 68)
- Strongly recommend immediate lawyer consultation
- Do NOT explain how to evade or minimize punishment`
    : "";

  const documentSection = isDocument
    ? `\n\nDOCUMENT MODE: Generate a complete ${docType} document with proper legal formatting. Use [PLACEHOLDER] for unknown details. Never invent case numbers, judge names, or government addresses.`
    : "";

  const categoryHint = category !== "unknown"
    ? `\nDetected legal area: ${category}`
    : "";

  return `You are a production-grade Legal AI assistant for Uzbekistan law.

LANGUAGE RULE: ${langInstruction}
${categoryHint}

════════════════════════════════════
CORE PRINCIPLES (NON-NEGOTIABLE)
════════════════════════════════════
1. RETRIEVAL-FIRST: Base ALL legal references on the retrieved context below.
   If a law is not in the retrieved context → say "exact article could not be verified."
2. NEVER invent article numbers, law names, or legal citations from memory.
3. NEVER repeat sentences or paragraphs.
4. NEVER explain how to commit crimes, evade justice, or destroy evidence.
5. You are a legal ASSISTANT — not a judge, lawyer, or prosecutor.
6. If uncertain → say "I am not certain" rather than guess.
7. Keep responses concise and actionable.

════════════════════════════════════
RESPONSE FORMAT (when relevant)
════════════════════════════════════
📌 Vaziyat / Situation: (brief summary)
⚖️ Huquqiy tahlil / Legal analysis: (based ONLY on retrieved laws)
✅ Nima qilish kerak / Steps: (clear, ordered)
📝 Hujjat / Document: (if requested)
📍 Xulosa / Conclusion: (short recommendation)

For simple questions: plain paragraph, no structure needed.

════════════════════════════════════
QUALITY CHECKLIST (internal)
════════════════════════════════════
Before responding, verify:
□ Is every article number from retrieved context?
□ Any repetition? → Remove
□ Is advice actionable and safe?
□ Is tone professional and calm?
□ Is response appropriately concise?
${criminalSection}${documentSection}${memorySection}${retrievedLaws}`;
}

// ── Groq call ─────────────────────────────────────────────────
async function callGroq(messages, model) {
  if (!groqClient) throw new Error("GROQ_API_KEY not configured");

  const resp = await groqClient.chat.completions.create({
    model:       model,
    messages,
    temperature: 0.25,
    top_p:       0.9,
    max_tokens:  2000,
  });

  return resp.choices?.[0]?.message?.content?.trim() || "";
}

// ── Gemini call ───────────────────────────────────────────────
async function callGemini(systemPrompt, userMessage, history, imageBase64, imageMimeType) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY not configured");

  const model = geminiClient.models;
  const contents = [];

  // History
  for (const msg of history) {
    contents.push({
      role:  msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "").slice(0, 600) }],
    });
  }

  // Current user message
  const userParts = [];
  if (imageBase64) {
    userParts.push({ inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } });
    userParts.push({
      text: `Analyze this legal document image carefully. Extract: names, dates, amounts, signatures, organization names, document type. Then answer: ${userMessage}`,
    });
  } else {
    userParts.push({ text: userMessage });
  }
  contents.push({ role: "user", parts: userParts });

  const resp = await model.generateContent({
    model:  "gemini-2.0-flash",
    config: {
      systemInstruction: systemPrompt,
      temperature:       0.25,
      topP:              0.9,
      maxOutputTokens:   2000,
    },
    contents,
  });

  return resp.text?.trim() || "";
}

// ── Main pipeline ─────────────────────────────────────────────
async function getLegalAdvice(userMessage, history = [], imageBase64 = null, imageMimeType = "image/jpeg", lang = "uz") {
  const msg = String(userMessage || "").trim().slice(0, 2000);
  if (!msg) return { answer: "Xabar bo'sh.", category: "unknown" };

  // Auto-detect language if not provided
  const detectedLang = lang === "uz" ? detectLanguage(msg) : lang;

  // ── STEP 1: Safety Check ──────────────────────────────────
  const safetyResult = checkUserMessage(msg);

  if (safetyResult.status === SAFETY_RESULT.BLOCKED) {
    return {
      answer:   safetyResult.message,
      category: "blocked",
    };
  }

  const hasSeriousCrime = safetyResult.status === SAFETY_RESULT.REDIRECTED;
  const criminalGuidance = hasSeriousCrime ? safetyResult.guidance : null;

  // ── STEP 2: Intent Detection ──────────────────────────────
  const category    = await detectIntentAI(msg);
  const uzCategory  = toUzCategory(category);

  // ── STEP 3: Document Detection ────────────────────────────
  const isDocumentRequest = /ariza|shikoyat|da['']vo|sudga|aliment|shartnoma|petitsiya|bildirishnoma|hujjat|document|заявление|жалоба|договор/i.test(msg);
  const docType = isDocumentRequest ? detectDocumentType(msg) : null;

  // ── STEP 4: Law Retrieval (RAG) ───────────────────────────
  let webContext = "";
  try {
    const searchQuery = `O'zbekiston ${category !== "unknown" ? category : ""} ${msg.slice(0, 150)} qonun`;
    const webResults  = await searchWeb(searchQuery, 4);
    webContext = formatSearchContext(webResults);
  } catch (err) {
    console.warn("Law retrieval skipped:", err.message);
  }

  // ── STEP 5: Conversation Memory ───────────────────────────
  const relevantHistory = buildConversationContext(history, msg);
  const legalFacts      = extractLegalFacts(history);
  const memorySummary   = buildMemorySummary(legalFacts);

  // ── STEP 6: Model Selection ───────────────────────────────
  const modelSelection = selectModel({
    userMessage:   msg,
    category,
    hasImage:      !!imageBase64,
    historyLength: history.length,
  });

  // ── STEP 7: Build System Prompt ───────────────────────────
  const systemPrompt = isDocumentRequest
    ? buildDocumentSystemPrompt(docType)
    : buildSystemPrompt({
        lang:           detectedLang,
        category,
        webContext,
        memorySummary,
        isDocument:     false,
        hasSeriousCrime,
        criminalGuidance,
      });

  // ── STEP 8: LLM Call ──────────────────────────────────────
  let rawAnswer = "";

  try {
    if (modelSelection.provider === "gemini" && geminiClient) {
      rawAnswer = await callGemini(systemPrompt, msg, relevantHistory, imageBase64, imageMimeType);
    } else if (groqClient) {
      const messages = [
        { role: "system",  content: systemPrompt },
        ...relevantHistory,
        { role: "user",    content: msg },
      ];
      rawAnswer = await callGroq(messages, modelSelection.model);
    } else {
      throw new Error("No AI provider available");
    }
  } catch (primaryErr) {
    console.warn(`Primary model (${modelSelection.model}) failed:`, primaryErr.message);

    // Fallback: boshqa provider
    try {
      if (modelSelection.provider === "gemini" && groqClient) {
        const fallbackMessages = [
          { role: "system", content: systemPrompt },
          ...relevantHistory,
          { role: "user",   content: msg },
        ];
        rawAnswer = await callGroq(fallbackMessages, "llama-3.3-70b-versatile");
      } else if (geminiClient) {
        rawAnswer = await callGemini(systemPrompt, msg, relevantHistory, null, null);
      } else {
        throw new Error("All providers failed");
      }
    } catch (fallbackErr) {
      console.error("All AI providers failed:", fallbackErr.message);
      return {
        answer:   "Hozir texnik muammo yuz berdi. Iltimos, biroz kutib qayta urinib ko'ring.",
        category: uzCategory,
      };
    }
  }

  // Og'ir jinoyat bo'lsa — boshida huquqiy ogohlantirish qo'shish
  if (hasSeriousCrime && criminalGuidance) {
    const warning = criminalGuidance.advice[detectedLang] || criminalGuidance.advice.uz;
    rawAnswer = `⚠️ ${warning}\n\n${rawAnswer}`;
  }

  // ── STEP 9: Answer Validation ─────────────────────────────
  const { valid, text: validatedAnswer } = validateAnswer(rawAnswer, {
    lang:          detectedLang,
    addDisclaimer: false, // Har doim disclaimer qo'shilmaydi — faqat kerakli hollarda
  });

  if (!valid) {
    return {
      answer:   "Javob yaratishda xatolik yuz berdi. Savolingizni boshqacha ifodalab ko'ring.",
      category: uzCategory,
    };
  }

  // ── STEP 10: Safety Response Check ───────────────────────
  const responseCheck = checkAIResponse(validatedAnswer);
  if (!responseCheck.safe) {
    console.warn("Safety filter triggered on AI response");
    return {
      answer:   "Bu mavzu bo'yicha umumiy huquqiy yo'nalish uchun malakali advokat bilan maslahatlashishni tavsiya etamiz.",
      category: uzCategory,
    };
  }

  return {
    answer:   validatedAnswer,
    category: uzCategory,
  };
}

module.exports = { getLegalAdvice };