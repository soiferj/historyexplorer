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
            tags: parsed.tags,
            regions: parsed.regions || [],
            countries: parsed.countries || []
        };
    } catch (e) {
        console.log("[OpenAI Parse Error]", e);
        return { description: "", tags: [], regions: [], countries: [] };
    }
}

// Add an event
router.post("/", verifyAllowedUser, async (req, res) => {
    const { title, description, book_reference, date, tags, date_type, regions, countries } = req.body;
    let enrichedDescription = description;
    let enrichedTags = tags;
    let enrichedRegions = regions;
    let enrichedCountries = countries;
    if (!description || !tags || tags.length === 0 || !regions || regions.length === 0 || !countries || countries.length === 0) {
        const enrichment = await enrichEventWithLLM({ title, date });
        if (!description) enrichedDescription = enrichment.description;
        if (!tags || tags.length === 0) enrichedTags = enrichment.tags;
        if (!regions || regions.length === 0) enrichedRegions = enrichment.regions;
        if (!countries || countries.length === 0) enrichedCountries = enrichment.countries;
    }
    const { data, error } = await supabase
        .from("events")
        .insert([{ title, description: enrichedDescription, book_reference, date, tags: enrichedTags, date_type, regions: enrichedRegions, countries: enrichedCountries }])
        .select(); // Ensure the inserted row(s) are returned

    if (error) return res.status(400).json({ error: error.message });
    // Return the first inserted event object (data is an array)
    res.json(data && data[0]);
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
    const { title, description, book_reference, date, tags, date_type, regions, countries } = req.body;
    const { data, error } = await supabase
        .from("events")
        .update({ title, description, book_reference, date, tags, date_type, regions, countries })
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

// Remove a tag from all events (admin only)
router.post("/remove-tag", verifyAllowedUser, async (req, res) => {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ error: "Tag is required" });
    try {
        // Fetch all events with the tag
        const { data: events, error: fetchError } = await supabase
            .from("events")
            .select("id, tags");
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        // Find events that have the tag
        const toUpdate = (events || []).filter(ev => Array.isArray(ev.tags) && ev.tags.includes(tag));
        // Remove the tag from each event's tags array
        for (const ev of toUpdate) {
            const newTags = ev.tags.filter(t => t !== tag);
            await supabase
                .from("events")
                .update({ tags: newTags })
                .eq("id", ev.id);
        }
        res.json({ success: true, updated: toUpdate.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove tag" });
    }
});

// Enrich description only
router.post("/enrich-description", verifyAllowedUser, async (req, res) => {
    const { title, date } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Title and date are required" });
    try {
        const enrichment = await enrichEventWithLLM({ title, date });
        res.json({ description: enrichment.description, regions: enrichment.regions, countries: enrichment.countries });
    } catch (e) {
        res.status(500).json({ error: "Failed to enrich description" });
    }
});

// Enrich tags only
router.post("/enrich-tags", verifyAllowedUser, async (req, res) => {
    const { title, date } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Title and date are required" });
    try {
        const enrichment = await enrichEventWithLLM({ title, date });
        res.json({ tags: enrichment.tags, regions: enrichment.regions, countries: enrichment.countries });
    } catch (e) {
        res.status(500).json({ error: "Failed to enrich tags" });
    }
});

// POST /events/backfill-regions (admin only)
router.post("/backfill-regions", verifyAllowedUser, async (req, res) => {
    try {
        const { data: events, error } = await supabase.from("events").select("*");
        if (error) return res.status(500).json({ error: error.message });
        let updated = 0;
        for (const event of events) {
            // Always regenerate and overwrite regions and countries
            const enrichment = await enrichEventWithLLM({ title: event.title, date: event.date });
            const updateObj = {};
            updateObj.regions = enrichment.regions || [];
            updateObj.countries = enrichment.countries || [];
            await supabase.from("events").update(updateObj).eq("id", event.id);
            updated++;
        }
        res.json({ success: true, updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
