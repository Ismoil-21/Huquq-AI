"use strict";
const router = require("express").Router();
const { Visitor } = require("../models");

/* POST /api/visitor/track - Track visitor */
router.post("/track", async (req, res) => {
  try {
    const { ip, userAgent, path, referrer, device, os, browser, country, city } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: "IP manzil kerak" });
    }

    // Check if visitor already exists today
    const today = new Date().toISOString().split("T")[0];
    const existingVisitor = await Visitor.findOne({ 
      ip,
      createdAt: { $gte: new Date(today) }
    });

    if (existingVisitor) {
      // Update existing visitor
      existingVisitor.visitCount += 1;
      existingVisitor.lastVisit = new Date();
      if (userAgent) existingVisitor.userAgent = userAgent;
      if (path) existingVisitor.path = path;
      if (referrer) existingVisitor.referrer = referrer;
      if (device) existingVisitor.device = device;
      if (os) existingVisitor.os = os;
      if (browser) existingVisitor.browser = browser;
      if (country) existingVisitor.country = country;
      if (city) existingVisitor.city = city;
      await existingVisitor.save();
      return res.json({ success: true, isNew: false });
    } else {
      // Create new visitor
      await Visitor.create({
        ip,
        userAgent: userAgent || "",
        path: path || "/",
        referrer: referrer || "",
        device: device || "",
        os: os || "",
        browser: browser || "",
        country: country || "",
        city: city || "",
        visitCount: 1,
      });
      return res.json({ success: true, isNew: true });
    }
  } catch (err) {
    console.error("visitor track:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
