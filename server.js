const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3002;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Knowlithic rPPG server running at http://localhost:${port}`);
});
