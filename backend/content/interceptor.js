

class PDFInterceptor{
    constructor(){ 
        this.initFileInputMonitoring();
    }

    initFileInputMonitoring(){
        document.addEventListener('change' , this.handleFileUpload.bind(this)); 
    }

    async handleFileUpload(event){
        const file = event.target;
        if(file?.type === 'applcation/pdf'){
            event.preventDefault();
            event.stopImmediatePropagation();
            const response = await chrome.runtime.sendMesssage({
                type : 'INTERCEPT_PDF',
                payload :{     
                    file : file.name,
                    size : file.size,
                    type : file.type
                }
            });
    
            if(response.action === 'SHOW_MODAL'){
                await renderModel(file, event.target);
            }
        }
    }
}

new PDFInterceptor();