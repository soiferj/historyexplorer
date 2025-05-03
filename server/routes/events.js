const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyAllowedUser } = require("../middleware/auth");

// Add an event
router.post("/", verifyAllowedUser, async (req, res) => {
    const { title, description, book_reference, date, tags, date_type } = req.body;
    const { data, error } = await supabase
        .from("events")
        .insert([{ title, description, book_reference, date, tags, date_type }]);

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
