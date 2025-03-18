const { spawn } = require('child_process');

async function extractText(imageDataUrl) {
    try {
        console.log('Request reached extractText function');
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,')) {
            throw new Error('Invalid imageDataUrl format');
        }

        const buffer = Buffer.from(imageDataUrl.split(',')[1], 'base64');
        console.log('Image buffer length:', buffer.length);

        const extractedText = await new Promise((resolve, reject) => {
            const tesseract = spawn('tesseract', ['stdin', 'stdout', '-l', 'eng']);
    
            let result = '';
            let error = '';
    
            tesseract.stdout.on('data', (data) => { result += data.toString(); });
            tesseract.stderr.on('data', (data) => { error += data.toString(); });
    
            tesseract.on('close', (code) => {
                if (code === 0) {
                    resolve(result.trim());
                } else {
                    console.error('Tesseract OCR Error:', error);
                    reject(new Error(`Tesseract exited with code ${code}: ${error}`));
                }
            });
    
            tesseract.stdin.write(buffer);
            tesseract.stdin.end();
        });

        console.log('Extracted OCR Text:\n', extractedText);
        return extractedText.trim();

    } catch (error) {
        console.error('Error in extracting text:', error.message);
        throw new Error(`Error extracting text: ${error.message}`);
    }
}

module.exports = { extractText };
