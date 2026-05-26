// Har bir user uchun alohida storage key — boshqa userning ma'lumotlari ko'rinmasin
function historyKey(userId) {
  return userId ? `huquq_chat_history_${userId}` : "huquq_chat_history_guest";
}
function activeKey(userId) {
  return userId ? `huquq_chat_active_${userId}` : "huquq_chat_active_guest";
}

export function loadHistory(userId) {
  try {
    return JSON.parse(localStorage.getItem(historyKey(userId)) || "[]");
  } catch {
    return [];
  }
}

export function upsertSession({ sessionId, messages, title, userId }) {
  if (!sessionId || !messages?.length) return;
  const history = loadHistory(userId).filter((h) => h.sessionId !== sessionId);
  history.unshift({
    sessionId,
    messages,
    title:
      title ||
      messages.find((m) => m.role === "user")?.content?.slice(0, 80) ||
      "Suhbat",
    updatedAt: Date.now(),
  });
  localStorage.setItem(historyKey(userId), JSON.stringify(history.slice(0, 30)));
}

export function getStoredSession(sessionId, userId) {
  return loadHistory(userId).find((h) => h.sessionId === sessionId);
}

export function getActiveSessionId(userId) {
  return localStorage.getItem(activeKey(userId));
}

export function setActiveSessionId(id, userId) {
  if (id) localStorage.setItem(activeKey(userId), id);
  else localStorage.removeItem(activeKey(userId));
}

export function deleteStoredSession(sessionId, userId) {
  const history = loadHistory(userId).filter((h) => h.sessionId !== sessionId);
  localStorage.setItem(historyKey(userId), JSON.stringify(history));
  if (getActiveSessionId(userId) === sessionId) setActiveSessionId(null, userId);
}

// Eski (umumiy) key lardan ma'lumotlarni tozalash — xavfsizlik uchun
export function clearGuestData() {
  localStorage.removeItem("huquq_chat_history");
  localStorage.removeItem("huquq_chat_active");
}

