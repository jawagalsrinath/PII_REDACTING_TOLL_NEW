export default async function checkPoilicies(payload){
    const {filename, size, type}  = payload;

    // check the file type first
    if( type != 'application/pdf') {
        console.warn(`BLocked : Unsupported file type ${type}`)
        return fasle;
    }

    // check for the filesize 
    const max_file_size_allowwed = 5 * 1024 * 1024 // 5 MB
    if( size > max_file_size_allowwed){
        console.warn(`Blocked : File ${filename} , exceeds the allowed size limit - 5 MB`);
        return false;
    }

    // future dev : permite the trusted sites that the web extensions works with .
}