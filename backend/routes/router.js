import { handlePDFIntercept } from '../content/handlers/interceptorHandlers/handlePDFInteceptor.js';
import { handlePDFSave } from '../content/handlers/interceptorHandlers/handlePDFSave.js';
import { handleUserAction } from '../content/handlers/interceptorHandlers/handleUserAction.js';

export default class MessageRouter {
    static async handleMessage(message, sender, sendResponse) {
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
}