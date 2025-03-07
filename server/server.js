const express = require('express');
const app = express();
const scanFileRouter = require('./handler/scanningHandlers'); // Assuming 'router.js' is correct
require('dotenv').config({ path: '../.env' }); // Ensure .env is in parent directory

const port = process.env.PORT; // Fallback to 3000 if PORT is undefined

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for now
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    console.log(`CORS headers set for ${req.method} ${req.url}`);
    next();
});

// Handle CORS preflight requests
app.options('*', (req, res) => {
    res.sendStatus(200);
});

// Mount routes
app.use('/api', scanFileRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});