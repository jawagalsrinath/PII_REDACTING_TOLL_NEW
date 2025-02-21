import { MessageRouter } from "./routes/router";
import { handleDownloadComplete, handleDownloadError, activeDowmnload } from "./handlers/downloadHandlers";


// Initialisation of message Router 
chrome.runtime.onMessage.addListener((request , sender , sendResponse) => {
    MessageRouter.handleMessage(request, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({
        status : 'error',
        message : error.message
    }));

    return true; // keep channel open for async responses 
});


chrome.downloads.onchangd.addListener((delta) => {
    if(delta.state?.current === 'complete') handleDownloadComplete(delta.id);
    if(delta.error?.current) handleDownloadError(delta.id, delta.error.current);

    // delta.error gives, returns "bool" error occured or not
    // delta.error.current gives the error message
});


// Persistent state 
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        downloadHistory : [],
        userPrefereces : {
            autoSave : false,
            defaultLocation : 'downloads',
        }
    });
});





