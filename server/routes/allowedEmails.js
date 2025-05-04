const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET /allowed-emails - fetch allowed emails from Supabase
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email');
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch allowed emails' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;