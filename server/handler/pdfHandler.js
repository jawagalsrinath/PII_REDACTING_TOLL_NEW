const { generateImages } = require('../controller/pdf_Controller/pdf_Image_Generator.js');
const { detectPII } =  require('../controller/pdf_Controller/pdf_PII_Detector.js');
const { extractText } = require('../controller/pdf_Controller/pdf_Image_To_Text.js');

const generateImagesInput = async (req, res) =>{
    const { dataUrl } = req.body;
    if(!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')){
        return res.status(400).json({ message : 'Invalid Data Url to the service'});
    }

    try{
        const images = await generateImages(dataUrl);
        res.status(200).json({ images });
    }
    catch(error){
        console.log('error in handle generate images : ', error);
        res.status(500).json({message : error.message});
    }
}

const detectPIIInput = async (req, res) => {
    try{
        const { text }= req.body;
        const pii = await detectPII(text);
        res.status(200).json({pii});
    }
    catch(error){
        console.log('Error in handler PII detect : ', error);
        res.status(500).json({message : error.message});
    }
}

const extractTextFromImageInput = async (req, res) => {
    const { imageDataUrl } = req.body;
    if(!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,')){
        console.log('Invalid Image Data Url to the service : extractTextFromIamgeInput');
        return res.status(400).json({ message : 'Invalid Image Data Url to the service'});
    }  

    try {
        const text = await extractText(imageDataUrl);
        console.log('Extracted OCR Text handler ======> :\n', text);
        res.status(200).json({ text });
    }

    catch(error){
        console.log('Error in extacting text from image in service : extractTextFromIamgeInput ', error);
        res.status(500).json({message : error.message});
    }
}




module.exports = { generateImagesInput, detectPIIInput, extractTextFromImageInput };

