/* 
    PDFModel is a custom element that manipulates the HTML template to display a modal dialog box, 
    when ever PDF file uplaoding if found.
*/


class PDFModal extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode: 'open'}); // shadow dom , works on top of the existing dom .

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
        // manipulating template with refrences to the shadow dom
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