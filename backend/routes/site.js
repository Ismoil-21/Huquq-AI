"use strict";
const router = require("express").Router();
const { SiteContent } = require("../models");

/* GET /api/site/content - Get site content */
router.get("/content", async (req, res) => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      // Create default content if none exists
      content = await SiteContent.create({});
    }
    return res.json(content);
  } catch (err) {
    console.error("get site content:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
