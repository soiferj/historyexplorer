const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const db = require('../db');

// Get all conversations for a user
router.get('/', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
        const conversations = await db()
            .collection('conversations')
            .find({ userId })
            .sort({ updatedAt: -1 })
            .toArray();
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
    try {
        const _id = new ObjectId(req.params.id);
        const conversation = await db()
            .collection('conversations')
            .findOne({ _id });
        if (!conversation) return res.status(404).json({ error: 'Not found' });
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new conversation
router.post('/', async (req, res) => {
    const { userId, messages } = req.body;
    if (!userId || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing userId or messages' });
    try {
        const now = new Date();
        const result = await db()
            .collection('conversations')
            .insertOne({ userId, messages, createdAt: now, updatedAt: now });
        res.json({ _id: result.insertedId, userId, messages, createdAt: now, updatedAt: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a conversation
router.put('/:id', async (req, res) => {
    try {
        const _id = new ObjectId(req.params.id);
        const { messages } = req.body;
        if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages array' });
        const now = new Date();
        const result = await db()
            .collection('conversations')
            .findOneAndUpdate(
                { _id },
                { $set: { messages, updatedAt: now } },
                { returnDocument: 'after' }
            );
        if (!result.value) return res.status(404).json({ error: 'Not found' });
        res.json(result.value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
