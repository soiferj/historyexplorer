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
        // If no covers on the work, try to find covers from an edition referenced in the URL or from editions list
        if ((!olData.covers || olData.covers.length === 0) && olType === 'works') {
            try {
                // 1) Try to extract an edition OLID anywhere in the provided URL (e.g., OL51055111M)
                const editionInUrl = (openlibrary_url.match(/OL[\dA-Z]+M/i) || [null])[0];
                if (editionInUrl) {
                    const bookApi = `https://openlibrary.org/books/${editionInUrl}.json`;
                    const bookResp = await fetch(bookApi);
                    if (bookResp.ok) {
                        const bookData = await bookResp.json();
                        if (bookData.covers && Array.isArray(bookData.covers) && bookData.covers.length > 0) {
                            olData.covers = bookData.covers;
                            console.log('books/add: found covers from edition in URL', editionInUrl);
                        }
                    }
                }
            } catch (e) {
                console.warn('books/add: failed to fetch edition from URL', e.message);
            }
            // 2) If still no covers, fetch the editions list for the work and search for covers on editions
            if ((!olData.covers || olData.covers.length === 0)) {
                try {
                    const editionsApi = `https://openlibrary.org/works/${olId}/editions.json?limit=20`;
                    const edResp = await fetch(editionsApi);
                    if (edResp.ok) {
                        const edData = await edResp.json();
                        if (edData && Array.isArray(edData.entries)) {
                            for (const ed of edData.entries) {
                                if (ed.covers && ed.covers.length > 0) {
                                    olData.covers = ed.covers;
                                    console.log('books/add: found covers from editions list');
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('books/add: failed to fetch editions list', e.message);
                }
            }
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
        // Allow the frontend to suggest a cover filename (cover_filename). Sanitize it; otherwise derive from title.
        const sanitizeFileName = (input) => {
            if (!input || typeof input !== 'string') return '';
            // strip path, remove extension, remove unsafe chars (but keep underscores), replace spaces with underscores
            const parts = input.replace(/\\/g, '/').split('/');
            let name = parts[parts.length - 1];
            name = name.replace(/\.[^/.]+$/, '');
            // keep underscores by allowing \w (letters, numbers, underscore) and spaces
            name = name.normalize('NFKD').replace(/[^\w ]/g, '').replace(/\s+/g, '_');
            return name ? (name + '.jpg') : '';
        };
        let fileName = sanitizeFileName(req.body.cover_filename || '');
        if (!fileName) {
            fileName = (title || '')
                .normalize("NFKD")
                .replace(/[^\w ]/g, "")
                .replace(/\s+/g, "_") + '.jpg';
        }
        // Check if file exists in bucket
        const { data: existing, error: listError } = await supabaseClient
            .storage
            .from(coversBucket)
            .list('', { search: fileName });
        const alreadyExists = Array.isArray(existing) && existing.some(f => f.name === fileName);
        // Determine if any covers exist after augmentation
        const coversFound = Array.isArray(olData.covers) && olData.covers.length > 0;

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
                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from(coversBucket)
                        .upload(fileName, buffer, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });
                    if (uploadError) {
                        console.warn('Failed to upload cover:', uploadError.message);
                    } else {
                        console.log('Uploaded cover:', { fileName, uploadData });
                    }
                } else {
                    console.warn('Failed to fetch cover URL:', coverUrl, 'status', coverResp.status);
                }
            }
        }
        // --- End Book Cover Logic ---
        return res.json({ success: true, book: data[0], covers_found: coversFound });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
