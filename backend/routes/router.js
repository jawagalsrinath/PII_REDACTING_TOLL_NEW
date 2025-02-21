import { handlePDFIntercept } from '../content/handlers/interceptorHandlers/handlePDFInteceptor.js';
import { handlePDFSave } from '../content/handlers/interceptorHandlers/handlePDFSave.js';
import { handleUserAction } from '../content/handlers/interceptorHandlers/handleUserAction.js';

export class MessageRouter{
    static handleMessage(message, sender, sendResponse){
        switch(message.type){
            case 'INTERCEPT_PDF':
                return handlePDFIntercept(message, sender, sendResponse);
            case 'SAVE_PDF':
                return handlePDFSave(message.payload);
            case 'USER_ACTION':
                return handleUserAction(message.payload);
            default:
                return {action : "NO_ACTION"};
        }
    }
}