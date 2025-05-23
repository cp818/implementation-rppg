const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Set up proper MIME types
const setCustomCacheControl = (res, path) => {
  if (path.endsWith('.html')) {
    // No caching for HTML files
    res.setHeader('Cache-Control', 'no-cache');
  } else if (path.endsWith('.css') || path.endsWith('.js')) {
    // Cache CSS and JS for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
};

// Serve static files with proper settings
app.use(express.static(__dirname, {
  setHeaders: setCustomCacheControl
}));

// Special handling for app.js to ensure it's served as JavaScript
app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

// Routes - always send the index.html for any route not found
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Special handler for Vercel deployment
module.exports = app;

// Only listen directly when running as a standalone server (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop the server');
  });
}
