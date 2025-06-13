const express = require('express');
const router = express.Router();
const supabase = require('../db');
const fetch = require('node-fetch');

// POST /books/add
// Body: { openlibrary_url: string }
router.post('/add', async (req, res) => {
    const { openlibrary_url } = req.body;
    if (!openlibrary_url || typeof openlibrary_url !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid openlibrary_url' });
    }
    // Extract OpenLibrary ID
    const match = openlibrary_url.match(/openlibrary.org\/(works|books)\/(OL[\dA-Z]+[MW])\/?/i);
    if (!match) {
        return res.status(400).json({ error: 'Invalid OpenLibrary URL' });
    }
    const olType = match[1];
    const olId = match[2];
    try {
        // Fetch book data from OpenLibrary
        const olApiUrl = olType === 'works'
            ? `https://openlibrary.org/works/${olId}.json`
            : `https://openlibrary.org/books/${olId}.json`;
        const olResp = await fetch(olApiUrl);
        if (!olResp.ok) throw new Error('Failed to fetch from OpenLibrary API');
        const olData = await olResp.json();
        let title = olData.title || '';
        let author = '';
        if (olData.authors && Array.isArray(olData.authors) && olData.authors.length > 0) {
            // For works, authors is an array of {author: {key: ...}}
            const authorKey = olData.authors[0].author?.key;
            if (authorKey) {
                const authorResp = await fetch(`https://openlibrary.org${authorKey}.json`);
                if (authorResp.ok) {
                    const authorData = await authorResp.json();
                    author = authorData.name || '';
                }
            }
        } else if (olData.by_statement) {
            author = olData.by_statement;
        } else if (olData.authors && typeof olData.authors === 'string') {
            author = olData.authors;
        }
        // Insert into Supabase
        const { data, error } = await supabase
            .from('books')
            .insert({
                openlibrary_url,
                title,
                author
            })
            .select();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.json({ success: true, book: data[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
