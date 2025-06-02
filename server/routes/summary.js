const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /summary - Generate AI summary of a list of events
router.post("/", async (req, res) => {
    try {
        const { events, forceRegenerate = false } = req.body;
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: "Events array is required" });
        }
        // Only include title, description, and year for each event
        const minimalEvents = events.map(ev => ({
            title: ev.title,
            description: ev.description,
            year: ev.date ? String(ev.date).slice(0, 4) : undefined
        }));
        // Create a hash of the minimalEvents array for cache key
        const hash = crypto.createHash("sha256").update(JSON.stringify(minimalEvents)).digest("hex");
        // Check Supabase cache unless forceRegenerate
        if (!forceRegenerate) {
            const { data: cacheData, error: cacheError } = await supabase
                .from("summary_cache")
                .select("summary")
                .eq("hash", hash)
                .single();
            if (!cacheError && cacheData && cacheData.summary) {
                return res.json({ summary: cacheData.summary, cached: true });
            }
        }
        // Load summary prompt template
        const promptPath = path.join(__dirname, "../data/summary_prompt.txt");
        let promptTemplate = fs.readFileSync(promptPath, "utf-8");
        // Insert events as JSON
        let prompt = promptTemplate.replace("{{events}}", JSON.stringify(minimalEvents, null, 2));
        console.log("[LLM SUMMARY REQUEST]", prompt); // Debug log
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [
                { role: "system", content: "You are a helpful assistant for an app that displays information about historical events." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 512
        });
        const content = response.choices[0].message.content;
        console.log("[LLM SUMMARY RESPONSE]", content); // Debug log
        let summary = "";
        let cached = false;
        try {
            const parsed = JSON.parse(content);
            summary = parsed.summary;
        } catch (e) {
            summary = content;
        }
        // Store in Supabase cache (upsert)
        await supabase.from("summary_cache").upsert({ hash, summary });
        res.json({ summary, cached });
    } catch (e) {
        console.error("[LLM SUMMARY ERROR]", e);
        res.status(500).json({ error: "Failed to generate summary: " + e.message });
    }
});

module.exports = router;
