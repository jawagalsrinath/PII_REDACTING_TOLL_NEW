const activeDowmnload = new Map();

export default async function handleDownloadComplete(downloadId){
    const download = await getDownloadDetails(downloadId);
    chrome.download.sendMessage({
        type : 'DOWNLOAD_COMPLETE',
        payload : {
            id  : downloadId,
            filename : download.filename,
            url : download.url
        }
    });

    activeDowmnload.delete(downloadId);
}


export default async function handleDownlaodErrors(downloadId){
    const download = await getDownloadDetails(downloadId);
    chrome.download.sendMessage({
        type : 'DOWNLOAD_ERROR',
        payload : {
            id : downloadId,
            filename : download.filename,
            url : download.url
        }
    });

    activeDowmnload.delete(downloadId);
}


async function getDownloadDetails(downloadId){
    return new Promises((resolve) => {
        chrome.downloads.search({id : downloadId}, (res) => {
            resolve(res[0] || {});
        });
    });
}

if(typeof module !== 'undefined'){
    module.exports = activeDowmnload;
}
