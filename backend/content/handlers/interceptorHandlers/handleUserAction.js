import { handleSavePDF } from './handleSavePDF';

export default async function handleUserAction(payload){
    try{
        console.log('User Action Payload : ', payload);
        // validating user action 
        if(!['ALLOW', 'DENY'].includes(payload?.action)){
            throw new Error('Invalid user action type');
        }


        switch(payload.action){

            case 'ALLOW':
                if(!payload.dataUrl || !payload.filename) {
                    throw new Error('Missing file data for ALLOW action');
                }

                const saveResults =  await handleSavePDF({
                    dataUrl : payload.dataUrl,
                    filename : payload.filename
                });

                console.log('Save Results : ', saveResults);
                return { 
                action : 'SAVE_RESULT',
                ...saveResults,
                timestamp : Date.now()
                }


            case 'DENY':
                return {
                    action : 'SAVE_CANCELLED',
                    filename : payload.filename,
                    timestamp : Date.now()
                }

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