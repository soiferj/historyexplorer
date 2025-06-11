const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");

// GET /config - fetch all config key/value pairs
router.get("/", verifyAllowedUser, async (req, res) => {
    try {
        const { data, error } = await supabase.from("config").select("key, value");
        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch configs" });
    }
});

// PUT /config - update a config value (existing keys only)
router.put("/", verifyAllowedUser, async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "Key is required" });
    try {
        // Only update if key exists
        const { data: existing, error: fetchError } = await supabase.from("config").select("id").eq("key", key).single();
        if (fetchError || !existing) return res.status(404).json({ error: "Config key not found" });
        const { error } = await supabase.from("config").update({ value }).eq("key", key);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to update config" });
    }
});

module.exports = router;
