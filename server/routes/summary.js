const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getConfigValue } = require("./configHelper");
const { getModelProvider } = require("./modelProvider");


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
        // Get default model from config
        const defaultModel = await getConfigValue("default_model");
        const provider = getModelProvider(defaultModel);
        const responseContent = await provider.chatCompletion([
            { role: "system", content: "You are a helpful assistant for an app that displays information about historical events." },
            { role: "user", content: prompt }
        ], { temperature: 0.2, max_tokens: 512 });
        let summary = "";
        let cached = false;
        try {
            const parsed = JSON.parse(responseContent);
            summary = parsed.summary;
        } catch (e) {
            summary = responseContent;
        }
        // Store in Supabase cache (upsert)
        const { error: upsertError, data: upsertData } = await supabase.from("summary_cache").upsert([{ hash, summary }]);
        if (upsertError) {
            console.error("[SUPABASE UPSERT ERROR]", upsertError);
        } else {
            console.log("[SUPABASE UPSERT SUCCESS]", upsertData);
        }
        res.json({ summary, cached });
    } catch (e) {
        console.error("[LLM SUMMARY ERROR]", e);
        res.status(500).json({ error: "Failed to generate summary: " + e.message });
    }
});

module.exports = router;
