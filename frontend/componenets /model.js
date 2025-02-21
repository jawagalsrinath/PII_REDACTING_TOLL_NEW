class PDFModal extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode: 'open'});

        fetch(chrome.runtime.getURL('frontend/components/model.html'))
            .then(response => response.text())
            .then(html => {
                const template = document.createElement('template');
                template.innerHTML = html;
                this.shadowRoot.appendChild(template.content.cloneNode(true));
            });
    }

    init(file , inputELement){
        this.file = file;
        this.inputElement = inputELement;
        this.render();
        this.bindevnts();
    }

    render(){
        const headerSlot = this.shadowRoot.quesrySelector('[name="header"]');
        const bodySlot = this.shadowRoot.querySelector('[name="body"]');

        if(headerSlot && bodySlot){
            headerSlot.innerHTML = `
                <h2>PDF Upload Detected</h2>
                <p> File : ${this.file.name}</p>
            `;

            bodySlot.innerHTML = `
            <div class='action'> 
                <button class='secondary'>Cancel</button>
                <button class='primary'> Save & Configure </button>
            </div> 
            `;
        }
    }

    bindEvents() {
        this.shadowRoot.querySelector('.primary').addEventListener('click', () => {
            chrome.runtime.sendMessage({
                type : 'USER_ACTION',
                payload : {
                    action : 'ALLOW',
                    file : this.file
                }
            });
        });
    }
}

customElements.define('pdf-model', PDFModal);