const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const { getConfigValue } = require("./configHelper");
const { getModelProvider } = require("./modelProvider");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichEventWithLLM({ title, date, existing_tags }) {
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
    let prompt = promptTemplate
        .replace("{{title}}", title)
        .replace("{{year}}", year);
    if (prompt.includes("{{existing_tags}}")) {
        prompt = prompt.replace("{{existing_tags}}", JSON.stringify(existing_tags || []));
    }
    console.log("[OpenAI Prompt]", prompt); // Log the prompt for debugging
    // Use config-based model provider
    const eventsModel = await getConfigValue("events_model");
    const provider = getModelProvider(eventsModel);
    let responseContent;
    try {
        responseContent = await provider.chatCompletion([
            { role: "system", content: "You are a helpful assistant for an app that displays information about historical events." },
            { role: "user", content: prompt }
        ], { temperature: 0, max_tokens: 256 });
    } catch (e) {
        console.log("[OpenAI Error]", e);
        return { description: "", tags: [], regions: [], countries: [] };
    }
    try {
        const parsed = JSON.parse(responseContent);
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
    // Special case: if title is exactly "test", skip LLM and return a string
    if (title === "test") {
        return res.json({
            title: "test",
            description: "test",
            book_reference,
            date,
            tags: ["test"],
            date_type,
            regions: [],
            countries: []
        });
    }
    let enrichedDescription = description;
    let enrichedTags = tags;
    let enrichedRegions = regions;
    let enrichedCountries = countries;
    // Get all existing tags from the database
    const { data: allEvents, error: fetchError } = await supabase.from("events").select("tags");
    let existingTags = [];
    if (!fetchError && Array.isArray(allEvents)) {
        const tagSet = new Set();
        allEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => tagSet.add(tag)));
        existingTags = Array.from(tagSet);
    }
    if (!description || !tags || tags.length === 0 || !regions || regions.length === 0 || !countries || countries.length === 0) {
        const enrichment = await enrichEventWithLLM({ title, date, existing_tags: existingTags });
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
    // Get all existing tags from the database
    const { data: allEvents, error: fetchError } = await supabase.from("events").select("tags");
    let existingTags = [];
    if (!fetchError && Array.isArray(allEvents)) {
        const tagSet = new Set();
        allEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => tagSet.add(tag)));
        existingTags = Array.from(tagSet);
    }
    if (!title || !date) return res.status(400).json({ error: "Title and date are required" });
    try {
        const enrichment = await enrichEventWithLLM({ title, date, existing_tags: existingTags });
        res.json({ description: enrichment.description, regions: enrichment.regions, countries: enrichment.countries });
    } catch (e) {
        res.status(500).json({ error: "Failed to enrich description" });
    }
});

// Enrich tags only
router.post("/enrich-tags", verifyAllowedUser, async (req, res) => {
    const { title, date } = req.body;
    // Get all existing tags from the database
    const { data: allEvents, error: fetchError } = await supabase.from("events").select("tags");
    let existingTags = [];
    if (!fetchError && Array.isArray(allEvents)) {
        const tagSet = new Set();
        allEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => tagSet.add(tag)));
        existingTags = Array.from(tagSet);
    }
    if (!title || !date) return res.status(400).json({ error: "Title and date are required" });
    try {
        const enrichment = await enrichEventWithLLM({ title, date, existing_tags: existingTags });
        res.json({ tags: enrichment.tags, regions: enrichment.regions, countries: enrichment.countries });
    } catch (e) {
        res.status(500).json({ error: "Failed to enrich tags" });
    }
});

// POST /events/regenerate-descriptions (admin only)
router.post("/regenerate-descriptions", verifyAllowedUser, async (req, res) => {
    try {
        const { data: events, error } = await supabase.from("events").select("*");
        if (error) return res.status(500).json({ error: error.message });
        // Get all existing tags from the database
        const { data: allEvents, error: fetchError } = await supabase.from("events").select("tags");
        let existingTags = [];
        if (!fetchError && Array.isArray(allEvents)) {
            const tagSet = new Set();
            allEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => tagSet.add(tag)));
            existingTags = Array.from(tagSet);
        }
        let updated = 0;
        for (const event of events) {
            // Regenerate and overwrite only the description field
            const enrichment = await enrichEventWithLLM({ title: event.title, date: event.date, existing_tags: existingTags });
            const updateObj = {
                description: enrichment.description || event.description
            };
            await supabase.from("events").update(updateObj).eq("id", event.id);
            updated++;
        }
        res.json({ success: true, updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /events/dedupe-tags (admin only): Generate tag deduplication mapping using OpenAI embeddings and KNN clustering
router.post("/dedupe-tags", verifyAllowedUser, async (req, res) => {
    const { tags } = req.body;
    // Use env or fallback defaults
    const embeddingThreshold = parseFloat(process.env.DEDUPE_EMBEDDING_THRESHOLD) || 0.7;
    const jaccardThreshold = parseFloat(process.env.DEDUPE_JACCARD_THRESHOLD) || 0.8;
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "Tags array is required" });
    }
    try {
        // 1. Get embeddings for all tags
        const embedResponse = await openai.embeddings.create({
            model: "text-embedding-3-large", // switched from small to large
            input: tags
        });
        const vectors = embedResponse.data.map(obj => obj.embedding);
        // 2. KNN clustering by cosine similarity
        function cosineSim(a, b) {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }
        // Helper: simple string similarity (Jaccard on lowercased word sets)
        function jaccardSim(a, b) {
            const setA = new Set(a.toLowerCase().split(/\s+/));
            const setB = new Set(b.toLowerCase().split(/\s+/));
            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const union = new Set([...setA, ...setB]);
            return intersection.size / union.size;
        }
        // Build cosine similarity matrix
        const simMatrix = Array(tags.length).fill(0).map(() => Array(tags.length).fill(0));
        for (let i = 0; i < tags.length; i++) {
            for (let j = 0; j < tags.length; j++) {
                if (i === j) simMatrix[i][j] = 1;
                else simMatrix[i][j] = cosineSim(vectors[i], vectors[j]);
            }
        }
        // Hybrid greedy clustering: assign to first cluster where (embedding sim >= embeddingThreshold OR jaccard >= jaccardThreshold), else new cluster
        let clusters = [];
        for (let i = 0; i < tags.length; i++) {
            let assigned = false;
            for (const cluster of clusters) {
                // Compute avg embedding sim to all tags in cluster
                let sumSim = 0;
                for (const idx of cluster) sumSim += simMatrix[i][idx];
                let avgSim = sumSim / cluster.length;
                // Compute max jaccard sim to any tag in cluster
                let maxJaccard = Math.max(...cluster.map(idx => jaccardSim(tags[i], tags[idx])));
                if (avgSim >= embeddingThreshold || maxJaccard >= jaccardThreshold) {
                    cluster.push(i);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) clusters.push([i]);
        }
        // Debug: print clusters and their tags
        console.log("[dedupe-tags] Hybrid Clusters (embedding OR jaccard):");
        clusters.forEach((cluster, idx) => {
            console.log(`  Cluster ${idx + 1}:`, cluster.map(i => tags[i]));
        });
        // 3. For each cluster, pick the winner (longest tag, or first alphabetically if tie)
        const mapping = {};
        for (const cluster of clusters) {
            let winner = tags[cluster[0]];
            for (const idx of cluster) {
                const tag = tags[idx];
                if (
                    tag.length > winner.length ||
                    (tag.length === winner.length && tag.toLowerCase() < winner.toLowerCase())
                ) {
                    winner = tag;
                }
            }
            for (const idx of cluster) {
                mapping[tags[idx]] = winner;
            }
        }
        // Debug: print mapping
        console.log("[dedupe-tags] Mapping:", mapping);
        res.json({ mapping });
    } catch (e) {
        res.status(500).json({ error: "Failed to generate dedupe mapping: " + e.message });
    }
});

// POST /events/apply-dedupe-tags (admin only): Apply deduplication mapping to all events
router.post("/apply-dedupe-tags", verifyAllowedUser, async (req, res) => {
    const { mapping } = req.body;
    if (!mapping || typeof mapping !== "object") {
        return res.status(400).json({ error: "Mapping object is required" });
    }
    try {
        // Build a case-insensitive mapping: lower-case all keys
        const ciMapping = {};
        for (const [k, v] of Object.entries(mapping)) {
            ciMapping[k.trim().toLowerCase()] = v;
        }
        // Fetch all events
        const { data: events, error } = await supabase.from("events").select("id, tags");
        if (error) return res.status(500).json({ error: error.message });
        let updated = 0;
        for (const ev of events) {
            if (!Array.isArray(ev.tags) || ev.tags.length === 0) continue;
            // Map each tag to its deduped version (case-insensitive, trim whitespace)
            const newTags = Array.from(new Set(ev.tags.map(t => {
                const key = t.trim().toLowerCase();
                return ciMapping[key] !== undefined ? ciMapping[key] : t;
            })));
            // Only update if tags actually change
            if (JSON.stringify(newTags) !== JSON.stringify(ev.tags)) {
                await supabase.from("events").update({ tags: newTags }).eq("id", ev.id);
                updated++;
            }
        }
        res.json({ success: true, updated });
    } catch (e) {
        res.status(500).json({ error: "Failed to apply dedupe mapping: " + e.message });
    }
});

module.exports = router;
