const express = require('express');
const { scanFile, getReport } = require('../controller/malwareScanning');


const scanFileInput = async (req, res) => {
    const {dataUrl } = req.body;

    if(!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')) {
        return res.status(400).json({ message : 'dataUrl is required'});
    }

    const base64Data = dataUrl.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');

    try{
        const response = await scanFile(fileBuffer);
        return res.status(200).json(response);
    }
    catch(error){
        return res.status(500).json({ message : error.message});
    }
}

const getReportInput = async (req, res) => {
    // console.log('Received /get-report request for scanId:', req.params.scanId);
    try{
        const result = await getReport(req.params.scanId);
        res.status(200).json(result);
    }
    catch(error){
        res.status(500).json({message : error.message})
    }
}

module.exports = { scanFileInput, getReportInput };