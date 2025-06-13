const express = require('express');
const router = express.Router();
const supabase = require('../db');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const coversBucket = 'book-covers';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// POST /books/add
// Body: { openlibrary_url: string }
router.post('/add', async (req, res) => {
    const { openlibrary_url, cover_id } = req.body;
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
        // Insert into Supabase (books table)
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

        // --- Book Cover Logic ---
        // Normalize file name as in bookCover.js
        const fileName = title
            .normalize("NFKD")
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "_") + '.jpg';
        // Check if file exists in bucket
        const { data: existing, error: listError } = await supabaseClient
            .storage
            .from(coversBucket)
            .list('', { search: fileName });
        const alreadyExists = Array.isArray(existing) && existing.some(f => f.name === fileName);
        if (!alreadyExists) {
            // Use selected cover_id if provided, else first available
            let coverId = cover_id;
            if (!coverId && olData.covers && Array.isArray(olData.covers) && olData.covers.length > 0) {
                coverId = olData.covers[0];
            }
            let coverUrl = null;
            if (coverId) {
                coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
            }
            if (coverUrl) {
                const coverResp = await fetch(coverUrl);
                if (coverResp.ok) {
                    const arrayBuffer = await coverResp.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    // Upload to Supabase Storage
                    const { error: uploadError } = await supabaseClient
                        .storage
                        .from(coversBucket)
                        .upload(fileName, buffer, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });
                    if (uploadError) {
                        console.warn('Failed to upload cover:', uploadError.message);
                    }
                }
            }
        }
        // --- End Book Cover Logic ---
        return res.json({ success: true, book: data[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
