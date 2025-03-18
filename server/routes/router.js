const express = require('express');
const router = express.Router();
const { scanFileInput, getReportInput } = require('../handler/scanningHandlers');
const { generateImagesInput, detectPIIInput, extractTextFromImageInput } = require('../handler/pdfHandler');
const { redactPdfOnServerInput } = require('../handler/redactingHandler');

router.post('/scan-file' , scanFileInput);
router.get('/get-report/:scanId', getReportInput);
router.post('/generate-images', generateImagesInput);
router.post('/detect-pii', detectPIIInput);
router.post('/extract-text', extractTextFromImageInput);
router.post('/redact_Pdf_With_PII', redactPdfOnServerInput);

module.exports = router;