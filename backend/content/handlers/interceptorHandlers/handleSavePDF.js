export default async function handleSavePDF(payload){

    try{
        if(!payload.dataurl || payload.filename){
            throw new Error("Invalid payload for saving PDF");
        }

        // saving PDF from the chrome extension
        const downloadId = await new Promise((resolve , reject) => {
            chrome.downloads.download(
                {
                    url : payload.dataurl,
                    filename : payload.filename,
                    conslictAction : 'uniquify',
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