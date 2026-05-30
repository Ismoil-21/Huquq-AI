"use strict";
/**
 * Document Generator
 * Professional huquqiy hujjatlar generatsiya qiladi.
 * Hech qachon o'ylab chiqarilgan:
 * - davlat manzillarini,
 * - sudya ismlarini,
 * - ish raqamlarini
 * keltirmaydi — faqat placeholder ishlatadi.
 */

const DOCUMENT_TYPES = {
  ARIZA: "ariza",
  SHIKOYAT: "shikoyat",
  SHARTNOMA: "shartnoma",
  DAAVO: "daavo",
  BILDIRISHNOMA: "bildirishnoma",
  TUSHUNTIRISH: "tushuntirish",
};

// Hujjat turini aniqlash
function detectDocumentType(userMessage) {
  const text = userMessage.toLowerCase();
  if (/da'?vo|иск|lawsuit/i.test(text)) return DOCUMENT_TYPES.DAAVO;
  if (/shikoyat|жалоба|complaint/i.test(text)) return DOCUMENT_TYPES.SHIKOYAT;
  if (/shartnoma|договор|contract/i.test(text)) return DOCUMENT_TYPES.SHARTNOMA;
  if (/bildirishnoma|уведомление|notice/i.test(text))
    return DOCUMENT_TYPES.BILDIRISHNOMA;
  if (/tushuntirish|объяснение|explanation/i.test(text))
    return DOCUMENT_TYPES.TUSHUNTIRISH;
  return DOCUMENT_TYPES.ARIZA;
}


// Hujjat shabloni uchun sistem prompt
function buildDocumentSystemPrompt(docType) {
  const base = `You are a professional legal document writer for Uzbekistan law.

STRICT RULES FOR DOCUMENT GENERATION:
1. Use PLACEHOLDERS for all unknown information:
   - Applicant name: [ISM FAMILIYA / ФИО]
   - Address: [MANZIL / АДРЕС]
   - Date: [SANA / ДАТА] 
   - Organization address: [MUASSASA MANZILI]
   - Case number: [ISH RAQAMI] — NEVER invent case numbers
   - Judge name: [SUDYA ISMI] — NEVER invent judge names
   - Amount: [SUMMA] if not specified by user

2. Use realistic legal formatting and official tone.
3. Structure the document with proper sections.
4. In Uzbekistan legal documents, include:
   - Header: To whom addressed
   - Applicant info section
   - Subject/Body with facts
   - Legal basis (only if certain — use verified codes)
   - Requests/Demands section
   - Date and signature line

5. If the user provided specific details (name, amount, organization), use them.
6. DO NOT invent specific article numbers unless you are certain they exist.
   If citing law: write the general code name only (e.g. "Mehnat kodeksi asosida").`;

  const typeInstructions = {
    [DOCUMENT_TYPES.ARIZA]: "Generate a formal APPLICATION (ariza/заявление).",
    [DOCUMENT_TYPES.SHIKOYAT]: "Generate a formal COMPLAINT (shikoyat/жалоба).",
    [DOCUMENT_TYPES.SHARTNOMA]:
      "Generate a formal CONTRACT template (shartnoma/договор).",
    [DOCUMENT_TYPES.DAAVO]:
      "Generate a formal LAWSUIT/CLAIM (da'vo arizasi/исковое заявление).",
    [DOCUMENT_TYPES.BILDIRISHNOMA]:
      "Generate a formal NOTICE (bildirishnoma/уведомление).",
    [DOCUMENT_TYPES.TUSHUNTIRISH]:
      "Generate a formal EXPLANATION (tushuntirish xati/объяснительная).",
  };

  return `${base}\n\n${typeInstructions[docType] || typeInstructions[DOCUMENT_TYPES.ARIZA]}`;
}

module.exports = {
  detectDocumentType,
  buildDocumentSystemPrompt,
  DOCUMENT_TYPES,
};
