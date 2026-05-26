"use strict";
const jwt = require("jsonwebtoken");

function makeGuard(type) {
  return function guard(req, res, next) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
    }
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== type) {
        return res.status(403).json({ error: "Ruxsat yo'q" });
      }
      req.authUser = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Token yaroqsiz yoki muddati tugagan" });
    }
  };
}

// Optional: JWT mavjud bo'lsa tekshiradi, bo'lmasa ham o'tkazadi
function optionalUserGuard(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    req.authUser = null;
    return next();
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === "user") req.authUser = decoded;
    else req.authUser = null;
  } catch {
    req.authUser = null;
  }
  next();
}

module.exports = {
  userGuard:         makeGuard("user"),
  adminGuard:        makeGuard("admin"),
  optionalUserGuard,
};
