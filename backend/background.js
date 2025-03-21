console.log("Background service worker initializing...");
const SERVER_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'zax12qs98cwdv65efbrgnt34hmyj56ukil7p'; // this is the token that the server will use to authenticate the extension

// <=================  Message Router =====================>e

/* Message Router : it routes, handles the message from the content script "interceptor.js" with the help of handlers 
        - handleInterceptPDF : checks the policies and decides whether to proceed with the file or not.
        - handleUserAction : handles the user action on the file , either to save or cancel the file.
        - handleSavePDF : saves the file in the downloads folder.
*/
const MessageRouter = {
    async handleMessage(message, sender) {
        console.log("Message received in MessageRouter:", message);
        
        switch(message.type) {
            case 'INTERCEPT_PDF':
                console.log("Handling INTERCEPT_PDF message...");
                return await handlePDFIntercept(message.payload);
            case 'USER_ACTION':
                console.log("Handling USER_ACTION message...");
                return await handleUserAction(message.payload);
            case 'SAVE_PDF':
                console.log("Handling SAVE_PDF message...");
                return await handleSavePDF(message.payload); 
            default:
                console.log("No handler for message type:", message.type);
                return { action: "NO_ACTION" };
        }
    }
};




// <=================  Message Listener =====================>
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background:", request);
    
    (async () => {
        try {
            const response = await MessageRouter.handleMessage(request, sender);
            sendResponse(response);
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({ error: error.message });
        }
    })();
    
    return true;
});




// <=================  Storage initialization  =====================>
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed/updated");
    chrome.storage.local.set({
        downloadHistory: [],
        userPreferences: {
            autoSave: false,
            defaultLocation: 'downloads',
        }
    });
});




// <=================  pdf interrupter =====================> 
async function handlePDFIntercept(payload){
    console.log("handlePDFIntercept function called with payload:", payload);
    const decision = await checkPoilicies(payload); // check the policies , if approved : proceed with the file.
    return decision ? { action : 'SHOW_MODAL'} : { action : 'BLOCK'} ;
}




// <=================  pdf file saving =====================> 
async function handleSavePDF(payload){

    try{
        
        if(!payload.dataUrl || !payload.filename){
            console.log('Invalid payload for saving PDF url : ', payload.dataUrl, "filenmae : ", payload.filename);
            throw new Error("Invalid payload for saving PDF");
        }

        // saving PDF from the chrome extension
        const downloadId = await new Promise((resolve , reject) => {
            chrome.downloads.download(
                {
                    url : payload.dataUrl,
                    filename : payload.filename,
                    conflictAction: 'uniquify', // saving pdf file with unique name if already exists
                    saveAs : false
                },
        
                (id) => {
                    if(chrome.runtime.lastError){
                        reject(new Error(chrome,runtime.lastError.meessage));
                    }
                    else{
                        resolve(id);
                    }
                }
            );
        });

        return {
            success : true,
            downloadId,
            filename : payload.filename
        };
    }

    catch(error){
        console.error("Error in saving PDF : ", error.message);
        return {
            success : false,
            message : error.message,
            filename : payload.filename || 'unknown'
        };
    }
}
 



// <=================  user action =====================>
async function handleUserAction(payload){
    try{
        console.log('User Action Payload : ', payload);
        
        // validating user action 
        if(!['ALLOW', 'DENY', 'SCAN_PDF', 'REDACT_PDF'].includes(payload?.action)){
            throw new Error('Invalid user action type');
        }


        switch(payload.action){

            case 'ALLOW':
                if(!payload.dataUrl || !payload.filename) throw new Error('Missing file data for ALLOW action');

                const saveResults =  await handleSavePDF({ dataUrl : payload.dataUrl, filename : payload.filename });

                console.log('Save Results : ', saveResults);
                return { 
                action : 'SAVE_RESULT',
                ...saveResults, // binds the saveResults object to the return object 
                timestamp : Date.now()
                }


            case 'DENY':
                return { action : 'SAVE_CANCELLED', filename : payload.filename, timestamp : Date.now() }
            
            case 'SCAN_PDF':
                const scanResult = await scanPDF(payload.dataUrl, payload.filename);
                if(scanResult && scanResult.total_detected_avs > 0) return { action : 'BLOCK' , reason : "MALWARE_DETECTED"};
                else return { action : 'SHOW_PII', filename : payload.filename , dataUrl : payload.dataUrl};
            
            case 'REDACT_PDF':
                const redactResult = await redactPDF(payload.dataUrl, payload.filename , payload.piiToRedact);
                return { action : 'REDACT_RESULT' , ...redactResult, timestamp : Date.now()};

            default:
                    throw new Error('Unhandeled user action type');

        }
    }
    
    catch(error){
        console.error('User Action Handling Error : ', error.message);
        return {
            action : 'ERROR',
            message : error.message,
            timestamp : Date.now()
        }
    }
}   

// <=================  pdf scanning =====================>
async function scanPDF(dataUrl, filename) {
    try {
        console.log('Scanning PDF : ', filename);
        const response = await fetch(`${SERVER_URL}/api/scan-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' , 'X-Auth-Token' : AUTH_TOKEN},
            body: JSON.stringify({ dataUrl })
        });

        /* In case of response is error in HTML formate from the server , then resposne.json() might casue error , so we using this response.text() -> console.log() -> parse to json 

            const text = await response.text();
            console.log(`Server response for ${filename}:`, { status: response.status, data: text });
            const scanData = JSON.parse(text);
        */
        
        const scanData =await response.json();
        if (!response.ok) throw new Error(scanData.error || `Failed to scan PDF (Status: ${response.status})`);
        const scanId = scanData.dataId;
        // console.log('PDF Scan Successful on file : ', filename, " \n Scan ID : ", scanId);

        let report;
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const reportResponse = await fetch(`${SERVER_URL}/api/get-report/${scanId}`,
                { headers: { 'X-Auth-Token': AUTH_TOKEN } }
            );
            report = await reportResponse.json();
            console.log(`Attempt ${i + 1} - Report for ${filename}:`, report);
            if (!reportResponse.ok) throw new Error(report.error || 'Failed to get scan report');
            if (report.scan_results.progress_percentage == 100) break;
        }

        console.log(`${filename} Scan Report : `, report);
        return report.scan_results;
    } catch (error) {
        console.error(`Error scanning PDF file => : ${filename}`, error.message); 
        return null;
    }
}


// <=================  pdf redaction =====================>
async function redactPDF(dataUrl, filename, piiToRedact) {
    try {
        console.log('Starting redactPDF with dataUrl:', dataUrl.slice(0, 50)); // Check input
        const images = await generateImages(dataUrl);
        console.log('Generated images:', images.length); // Verify array
        const piiResults = [];
        for (const [index, image] of images.entries()) {
            console.log('Processing image', index + 1);
            const pii = await detectPIIFromImages(image);
            console.log('PII for page', index + 1, ':', pii);
            piiResults.push({ page: index + 1, pii });
        }
        console.log('Detected PII:', piiResults, 'PII want to redact:', piiToRedact);

        const redactDataUrl  = await redactPdfOnServer(dataUrl, piiResults, piiToRedact);
        console.log('Redacted PDF data url : ', redactDataUrl);
        return {
            success : true,
            redactDataUrl : redactDataUrl
        };
    } catch (error) {
        console.error('Error in redactPDF:', error); // Log full error object
        return {
            action : 'ERROR',
            message : error.message,
            timestamp : Date.now()
        }// Bubble up with details
    }
}


// <================= check policies =====================>
async function checkPoilicies(payload){
    const {filename, size, type}  = payload;

    // check the file type first
    if( type != 'application/pdf') {
        console.warn(`BLocked : Unsupported file type ${type}`)
        return fasle;
    }

    // check for the filesize 
    const max_file_size_allowwed = 5 * 1024 * 1024 // 5 MB
    if( size > max_file_size_allowwed){
        console.warn(`Blocked : File ${filename} , exceeds the allowed size limit - 5 MB`);
        return false;
    }

    return true;

    // future dev : permite the trusted sites that the web extensions works with .
}


// <================= generate Images =====================>
async function generateImages(dataUrl){
    const response = await fetch(`${SERVER_URL}/api/generate-images`, {
        method : 'POST',
        headers : { 'Content-Type' : 'application/json' , 'X-Auth-Token' : AUTH_TOKEN},
        body : JSON.stringify({dataUrl})
    });

    if(!response.ok) throw new Error("Error in image generation");
    const { images } = await response.json();
    return images;
}


// <================= detecting PII from Images =====================>
async function detectPIIFromImages(imageDataUrl){
    try {
        const text  =  await extractTextFromImages(imageDataUrl);
        console.log('Text Extracted from image in detectPII : ', text);
        // if(text.length() == 0) throw new Error('No text extracted from image');
        const response  = await fetch(`${SERVER_URL}/api/detect-pii`, {
            method : 'POST',
            headers : { 'Content-Type' : 'application/json' , 'X-Auth-Token' : AUTH_TOKEN},
            body : JSON.stringify({text})
        });
    
        if(!response.ok){
            console.log('Detect PII response give error :', response);
            throw new Error('Error in fetching PII from images');
        }
        const pii =  await response.json();
        console.log('PII Detected (testing ): ', pii);
        return pii;
    }
    catch(error){
        console.error('Error in detecting PII from images : ', error.message);
        throw new Error(`Error in detecting PII from images : ${error.message}`);
    }
}


// <================= Extracting text using OCR =====================>
async function extractTextFromImages(imageDataUrl){
    try{
        if(!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,')) throw new Error('Invalid imageDataUrl');
        const response  = await fetch(`${SERVER_URL}/api/extract-text`,{
            method : 'POST',
            headers : { 'Content-Type' : 'application/json' , 'X-Auth-Token' : AUTH_TOKEN},
            body : JSON.stringify({imageDataUrl})
        });

        if(!response.ok){
            console.log('Error in extracting text from images : ' , response);
            throw new Error('Error in extracting text from images');
        }

        const { text } = await response.json();
        return text;
    }
    catch(error){
        console.error('Error in extracting text from images : ', error.message);
        throw new Error(`Error in extracting text from images : ${error.message}`);
    }
}


// <================= Redacting PDF on the server =====================>
async function redactPdfOnServer(dataUrl, piiResults, piiToRedact){
    try{
        if(!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')){
            throw new Error('Invalid dataUrl format');
        }

        if (!Array.isArray(piiResults)) {
            throw new Error('piiResults must be an array');
        }

        const response = await fetch(`${SERVER_URL}/api/redact_Pdf_With_PII`, {
            method : 'POST',
            headers : { 'Content-Type' : 'application/json', 'X-Auth-Token' : AUTH_TOKEN },
            body : JSON.stringify({dataUrl, piiResults, piiToRedact})
        });

        if(!response.ok){
            console.log('Error in Redacting pdf with PII : ', response);
            throw new Error('Error in Redacting PDF with PII ')
        }

        const data = await response.json();
        const redactPdfUrl = data.redactedPDFUrl; // Extract the string directly
        console.log('Redacted PDF Url from server:', redactPdfUrl.slice(0, 50));
        return redactPdfUrl;
    }

    catch(error){
        console.log('Error in redacting Pdf with PII in service (redactPdfOnServer) : ', error.message);
        throw new Error('Error in redacting Pdf with PII in service (redactPdfOnServer) : ', error.message);
    }
}

console.log("Background service worker initialized successfully");