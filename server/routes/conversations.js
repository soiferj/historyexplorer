const express = require('express');
const router = express.Router();
const supabase = require("../db");

// Get all conversations for a user
router.get('/', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
            throw error;
        }
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new conversation
router.post('/', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
        const { data, error } = await supabase
            .from('conversations')
            .insert([{ user_id: userId }])
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a conversation
router.put('/:id', async (req, res) => {
    // No update logic for conversations since only user_id and created_at are present
    res.status(400).json({ error: 'No updatable fields for conversation.' });
});

module.exports = router;
