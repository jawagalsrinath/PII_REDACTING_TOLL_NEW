const express = require('express');
const router = express.Router();
const { scanFileInput, getReportInput } = require('../handler/scanningHandlers');


router.post('/scan-file' , scanFileInput);
router.get('get-report/:dataId', getReportInput);

module.exports = router;