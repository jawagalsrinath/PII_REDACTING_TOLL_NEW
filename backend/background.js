import { handlePDFIntercept } from '/content/handlers/interceptorHandlers/handlePDFInteceptor.js';
import { handlePDFSave } from '/content/handlers/interceptorHandlers/handlePDFSave.js';
import { handleUserAction } from '/content/handlers/interceptorHandlers/handleUserAction.js';

console.log("Background service worker initializing...");

// Simple message router object
const MessageRouter = {
    async handleMessage(message, sender) {
        console.log("Message received in MessageRouter:", message);
        
        switch(message.type) {
            case 'INTERCEPT_PDF':
                console.log("Handling INTERCEPT_PDF message...");
                return handlePDFIntercept(message, sender, sendResponse);
            case 'USER_ACTION':
                console.log("Handling USER_ACTION message...");
                return handleUserAction(message.payload);
            case 'SAVE_PDF':
                console.log("Handling SAVE_PDF message...");
                return handlePDFSave(message.payload);   
            default:
                console.log("No handler for message type:", message.type);
                return { action: "NO_ACTION" };
        }
    }
};

// Message listener
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

// Basic storage initialization
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

console.log("Background service worker initialized successfully");