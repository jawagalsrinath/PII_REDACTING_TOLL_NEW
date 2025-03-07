console.log("Background service worker initializing...");
const SERVER_URL = 'http://localhost:3000';

// <=================  Message Router =====================>

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl })
        });

        const text = await response.text();
        // console.log(`Server response for ${filename}:`, { status: response.status, data: text });
        const scanData = JSON.parse(text);
        if (!response.ok) throw new Error(scanData.error || `Failed to scan PDF (Status: ${response.status})`);
        const scanId = scanData.dataId;
        // console.log('PDF Scan Successful on file : ', filename, " \n Scan ID : ", scanId);

        let report;
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const reportResponse = await fetch(`${SERVER_URL}/api/get-report/${scanId}`);
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
async function redactPDF(dataUrl, filename, piiTpoRedact){
    try{
        console.log('Redacting PDF : ', filename , ' PII : ', piiTpoRedact);
        const response = await handleSavePDF({dataUrl, filename});
        return { success : true, ...response};
    }
    catch(error){
        return { success : false, message : error.message, filename};
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




console.log("Background service worker initialized successfully");