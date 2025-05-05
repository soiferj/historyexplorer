const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichEventWithLLM({ title, date }) {
    // Only pass the year to the LLM
    let year = date;
    if (typeof date === "string" && date.length >= 4) {
        const match = date.match(/\d{4}/);
        if (match) year = match[0];
    }
    // Load prompt template from file
    const promptPath = path.join(__dirname, "../data/prompt.txt");
    let promptTemplate = fs.readFileSync(promptPath, "utf-8");
    // Replace placeholders
    const prompt = promptTemplate
        .replace("{{title}}", title)
        .replace("{{year}}", year);
    console.log("[OpenAI Prompt]", prompt); // Log the prompt for debugging
    const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
            { role: "system", content: "You are a helpful assistant for an app that displays information about historical events." },
            { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 256
    });
    try {
        const content = response.choices[0].message.content;
        console.log("[OpenAI Response]", content); // Log the response for debugging
        const parsed = JSON.parse(content);
        return {
            description: parsed.description,
            tags: parsed.tags
        };
    } catch (e) {
        console.log("[OpenAI Parse Error]", e);
        return { description: "", tags: [] };
    }
}

// Add an event
router.post("/", verifyAllowedUser, async (req, res) => {
    const { title, description, book_reference, date, tags, date_type } = req.body;
    let enrichedDescription = description;
    let enrichedTags = tags;
    if (!description || !tags || tags.length === 0) {
        const enrichment = await enrichEventWithLLM({ title, date });
        if (!description) enrichedDescription = enrichment.description;
        if (!tags || tags.length === 0) enrichedTags = enrichment.tags;
    }
    const { data, error } = await supabase
        .from("events")
        .insert([{ title, description: enrichedDescription, book_reference, date, tags: enrichedTags, date_type }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Get all events
router.get("/", async (req, res) => {
    const { data, error } = await supabase.from("events").select("*");

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Update an event
router.put("/:id", verifyAllowedUser, async (req, res) => {
    const { id } = req.params;
    const { title, description, book_reference, date, tags, date_type } = req.body;
    const { data, error } = await supabase
        .from("events")
        .update({ title, description, book_reference, date, tags, date_type })
        .eq("id", id)
        .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete an event
router.delete("/:id", verifyAllowedUser, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;
