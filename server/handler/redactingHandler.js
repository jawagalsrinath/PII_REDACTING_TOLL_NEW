const {redactPdfWithPII} = require('../controller/redactingController');
const redactPdfOnServerInput = async( req, res) => {
    const { dataUrl , piiResults , piiToRedact} = req.body;

    if(!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')){
        return res.status(400).json({ message : 'Invalid Data Url to the service'});
    }

    try{
        const redactedPDFUrl = await redactPdfWithPII(dataUrl, piiResults, piiToRedact);
        return res.status(200).json({redactedPDFUrl});
    }
    catch(error){
        console.log('Error in redact pdf with PII (redactingHandler) : ', error.message);
        return res.status(500).json({message : error.message});
    }
}

module.exports = { redactPdfOnServerInput }