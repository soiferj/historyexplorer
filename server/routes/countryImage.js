const express = require('express');
const router = express.Router();

// You should set these in your environment variables
const SUPABASE_COUNTRY_IMAGES_PUBLIC_URL = process.env.SUPABASE_COUNTRY_IMAGES_PUBLIC_URL; // e.g. https://<project>.supabase.co/storage/v1/object/public/countries

// GET /api/country-continent-image?country=CountryName
router.get('/', async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).send('Missing country parameter');

  // Normalize and lowercase country name for filename
  const normalized = country
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  const fileName = normalized + '.png';

  console.log(`Fetching continent image for country: ${country}, fileName: ${fileName}`);

  const publicUrl = `${SUPABASE_COUNTRY_IMAGES_PUBLIC_URL}/${fileName}`;
  return res.redirect(publicUrl);
});

module.exports = router;
