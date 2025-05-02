const express = require("express");
const router = express.Router();
const supabase = require("../db");

// Add an event
router.post("/", async (req, res) => {
    const { title, description, book_reference, date, tags } = req.body;
    const { data, error } = await supabase
        .from("events")
        .insert([{ title, description, book_reference, date, tags }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Get all events
router.get("/", async (req, res) => {
    const { data, error } = await supabase.from("events").select("*");

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

module.exports = router;
