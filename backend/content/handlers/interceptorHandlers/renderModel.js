export async function renderModel(file, inputElement) {
    console.log("renderModel called with file:", file);
    // Basic implementation for now
    const modalPath = chrome.runtime.getUrl('../../frontend/components/model.html');
    const modal = await fetch(modalPath).then(res => res.text());

    const container = document.createElement('div');
    container.innerHTML = modal;
    document.body.appendChild(container);

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getUrl('../../../frontend/styles/model.css');
    document.head.appendChild(style);

    const modalComponent = container.querySelector('pdf-model');
    modalComponent.init(file, inputElement);
}

