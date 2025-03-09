const express = require('express');
const app = express();
const scanFileRouter = require('./routes/router'); 
require('dotenv').config({ path: '../.env' }); 
const port = process.env.PORT; 


app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    // console.log(`CORS headers set for ${req.method} ${req.url}`);
    next();
});


app.options('*', (req, res) => {
    res.sendStatus(200);
});


app.use('/api', scanFileRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});