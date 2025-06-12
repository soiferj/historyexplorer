const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// You should set these in your environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET = 'book-covers';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GET /api/book-cover?book=Book Title
router.get('/', async (req, res) => {
  const { book } = req.query;
  if (!book) return res.status(400).send('Missing book parameter');

  // Match the filename logic from the frontend, but normalize unicode for curly quotes, etc.
  const fileName = book
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, "_") + '.jpg';

  console.log(`Fetching cover for book: ${book}, fileName: ${fileName}`);

  // Build the Supabase public URL for the cover using env var
  const SUPABASE_PUBLIC_URL = process.env.SUPABASE_COVERS_PUBLIC_URL;
  const publicUrl = `${SUPABASE_PUBLIC_URL}/${fileName}`;
  return res.redirect(publicUrl);
});

module.exports = router;
