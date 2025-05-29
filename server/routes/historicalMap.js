const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Endpoint to get all available years from GitHub
router.get('/years', async (req, res) => {
  try {
    const githubApiUrl = 'https://api.github.com/repos/aourednik/historical-basemaps/contents/geojson';
    const response = await fetch(githubApiUrl);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch years from GitHub' });
    }
    const files = await response.json();
    const years = files
      .map(f => f.name)
      .filter(name => name.startsWith('world_') && name.endsWith('.geojson'))
      .map(name => {
        const match = name.match(/^world_(bc)?(\d+)\.geojson$/i);
        if (!match) return null;
        const isBC = !!match[1];
        const yearNum = parseInt(match[2], 10);
        return isBC ? -yearNum : yearNum;
      })
      .filter(y => y !== null)
      .sort((a, b) => a - b);
    res.json({ years });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch or parse years' });
  }
});

// Example: /api/historical-map/:year
router.get('/:year', async (req, res) => {
  const { year } = req.params;
  let fileName;
  if (/^\d+$/.test(year)) {
    fileName = `world_${year}.geojson`;
  } else if (/^bc\d+$/i.test(year)) {
    fileName = `world_${year.toLowerCase()}.geojson`;
  } else {
    return res.status(400).json({ error: 'Invalid year format' });
  }
  const githubUrl = `https://raw.githubusercontent.com/aourednik/historical-basemaps/refs/heads/master/geojson/${fileName}`;
  try {
    const response = await fetch(githubUrl);
    if (!response.ok) {
      console.error('GitHub fetch failed:', response.status, response.statusText);
      return res.status(404).json({ error: 'Map not found for year' });
    }
    const geojson = await response.json();
    const labels = geojson.features.map(f => f.properties && (f.properties.name || f.properties.label || f.properties.admin || f.properties.country)).filter(Boolean);
    res.json({ geojson, labels });
  } catch (e) {
    console.error('Error fetching or parsing map data:', e);
    res.status(500).json({ error: 'Failed to fetch or parse map data' });
  }
});

// Catch-all for debugging unmatched requests
router.use((req, res) => {
  console.log('Unmatched historicalMap route:', req.method, req.originalUrl);
  res.status(404).json({ error: 'No matching historicalMap route', path: req.originalUrl });
});

module.exports = router;