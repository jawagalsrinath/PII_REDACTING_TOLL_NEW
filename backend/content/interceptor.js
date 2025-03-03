console.log("Content script injected!");


// <=================  render Model =====================>
async function renderModel(file, inputElement) {
    console.log("renderModel called with file:", file);
    try {
        // 1. Load the template
        const modalUrl = chrome.runtime.getURL('frontend/components/model.html'); // Load HTML file
        console.log("Modal URL:", modalUrl);
        const modalResponse = await fetch(modalUrl);
        const modalText = await modalResponse.text();
        console.log("Modal HTML loaded:", modalText);
        
        // 2. Create temporary container and insert template
        const container = document.createElement('div');
        container.innerHTML = modalText;
        
        // 3. Get the template content
        const template = container.querySelector('#pdf-modal-template'); // Get the template
        if (!template) {
            throw new Error("Modal template not found");
        }
        
        // 4. Clone the template content
        const modalContent = template.content.cloneNode(true);
        
        // 5. Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.id = 'pdf-modal-container';
        modalContainer.appendChild(modalContent);
        
        // 6. Add styles
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = chrome.runtime.getURL('frontend/styles/model.css'); // Load CSS file
        document.head.appendChild(style);
        
        // 7. Add to document
        document.body.appendChild(modalContainer);
        
        // 8. Update filename
        const filenameElement = modalContainer.querySelector('.filename');
        if (filenameElement) {
            filenameElement.textContent = file.name;
        }
        
        // 9. Add event listeners
        const allowBtn = modalContainer.querySelector('.allow-btn');
        const denyBtn = modalContainer.querySelector('.deny-btn');
        
        if (allowBtn) {
            allowBtn.addEventListener('click', async () => {
                console.log('Allow button clicked for file:', file.name);
        
                try {
                    /*
                        FileReader : This is an object for reading files asynchronously, in many formates like data , dataURL, binary etc..,.
                        readAsDataURL :  Reads the contents of a file as a data URL , useful for downloading data in extension. 
                    */ 
                    const fileReader = new FileReader();
                    fileReader.readAsDataURL(file);
                    fileReader.onload = function () {
                        chrome.runtime.sendMessage({
                            type: 'USER_ACTION',
                            payload: {
                                action: 'ALLOW',
                                filename: file.name,
                                dataUrl: fileReader.result // Data URL
                            }
                        }, (response) => {
                            console.log('Response from background script allow:', response);
                        });
                    };
                } catch (error) {
                    console.error("Error converting file to Data URL:", error);
                }
        
                modalContainer.remove();
            });
        }        
        
        if (denyBtn) {
            denyBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'USER_ACTION',
                    payload: {
                        action: 'DENY',
                        filename: file.name
                    }
                }, (response) => {
                    console.log('Response from background script:', response);
                });
                modalContainer.remove();
            });
        }

        console.log("Modal container added to document:", document.querySelector('#pdf-modal-container'));
        console.log("Style element added:", document.querySelector('link[href*="model.css"]'));

    } catch (error) {
        console.error("Error in renderModel:", error);
        throw error;
    }
}



// <=================  PDF Interceptor Class =====================>
class PDFInterceptor {
    constructor() { 
        this.initFileInputMonitoring();
    }

    initFileInputMonitoring() {
        // Monitor both change and input events with capture phase
        document.addEventListener('change', this.handleFileUpload.bind(this), true); 
        
        // Add mutation observer for dynamically added file inputs
        this.observeFileInputs();
    }

    observeFileInputs() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'INPUT' && node.type === 'file') {
                        node.addEventListener('change', this.handleFileUpload.bind(this), true);
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    async handleFileUpload(event) {
        const fileInput = event.target;
        const file = fileInput.files?.[0];

        console.log("File input changed:", fileInput);
        console.log("Selected file:", file);

        if (file?.type === 'application/pdf') {
            // Prevent default immediately
            event.preventDefault();
            event.stopPropagation();
            
            console.log("PDF file detected:", file);
            
            try {
                // Use Promise wrapper for chrome.runtime.sendMessage
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'INTERCEPT_PDF',
                        payload: {
                            filename: file.name,
                            size: file.size,
                            type: file.type
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });

                console.log("Response from background script:", response);

                if (response?.action === 'SHOW_MODAL') {
                    console.log("SHOW_MODAL action received, calling renderModel...");
                    await renderModel(file, fileInput);
                } else {
                    console.log("Action was not SHOW_MODAL:", response?.action);
                }
            } catch (error) {
                console.error("Error during PDF interception:", error);
            }
        }
    }
}


// <=================  PDF Interceptor Instance =====================>
new PDFInterceptor();

