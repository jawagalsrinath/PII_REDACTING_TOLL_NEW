const express = require('express');
const app = express();
const scanFileRouter = require('./routes/router'); 
require('dotenv').config({ path: '../.env' }); 
const port = process.env.PORT; 


app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // need to change it to the chrome unique ID 
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
    // console.log(`CORS headers set for ${req.method} ${req.url}`);
    next();
});


app.use((req, res, next) => {
    const authToken = req.headers['X-Auth-Token'];
    if(authToken === process.env.AUTH_TOKEN){
        return res.status(401).json({ error : 'Unauthorized'});
    }
    next();
});


app.options('*', (req, res) => {
    res.sendStatus(200);
});


app.use('/api', scanFileRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});