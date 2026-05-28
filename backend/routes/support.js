"use strict";
const router = require("express").Router();
const { SupportMessage, User } = require("../models");

/* POST /api/support - Send support message */
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
    }
    
    // Ism va email ikkalasi ham majburiy
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Ism kiritish shart" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email kiritish shart" });
    }
    
    // Email foydalanuvchilar orasida borligini tekshirish
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "Bu email bilan ro'yxatdan o'tgan foydalanuvchi topilmadi" });
    }
    
    const supportMsg = await SupportMessage.create({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    return res.status(201).json({ success: true, message: "Xabar yuborildi" });
  } catch (err) {
    console.error("support message error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/support - Get all support messages (admin only) */
router.get("/", async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.json(messages);
  } catch (err) {
    console.error("get support messages error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* PATCH /api/support/:id - Update status (admin only) */
router.patch("/:id", async (req, res) => {
  try {
    const { status, read } = req.body;
    const updateData = {};
    if (status && ["pending", "resolved"].includes(status)) {
      updateData.status = status;
    }
    if (typeof read === "boolean") {
      updateData.read = read;
    }
    const message = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!message) return res.status(404).json({ error: "Xabar topilmadi" });
    return res.json(message);
  } catch (err) {
    console.error("update support message error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* DELETE /api/support/:id - Delete message (admin only) */
router.delete("/:id", async (req, res) => {
  try {
    await SupportMessage.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error("delete support message error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
