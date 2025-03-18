import { fromBuffer as convertPdfToPng } from 'pdf2pic';

async function generateImages(dataUrl) {
    try {
        console.log('dataUrl length:', dataUrl.length);
        if (!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')) {
            throw new Error('Invalid dataUrl format');
        }

        const pdfBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
        console.log('PDF buffer length:', pdfBuffer.length);

        if (pdfBuffer.length < 1000) {
            throw new Error('PDF buffer is too small to be valid');
        }

        const pdf2picOptions = {
            format: 'png',
            width: 800,
            height: 1132,
            density: 200, // Increased from 150 to 200 for better quality
            // Uncomment the next line if you want to debug with file output
            // savePath: '/tmp', // Temporary directory for debugging
            // outputFormat: 'page-{n}.png' // File name format
        };

        const pages = [];
        const maxPages = 100;
        const convert = convertPdfToPng(pdfBuffer, pdf2picOptions);

        let i = 1;
        while (i <= maxPages) {
            try {
                const result = await convert(i, { responseType: 'base64' });
                if (!result || !result.base64) {
                    console.log('Conversion failed: base64 output is empty for page', i);
                    break;
                }

                const base64 = result.base64;
                const imageDataUrl = `data:image/png;base64,${base64}`;
                const buffer = Buffer.from(base64, 'base64');

                // Validate PNG signature
                const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
                const isValidPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature);
                if (!isValidPng) {
                    throw new Error(`Generated image for page ${i} is not a valid PNG`);
                }

                // Check image size
                if (buffer.length < 5000) {
                    console.warn(`Generated image for page ${i} is unusually small (${buffer.length} bytes) - might be blank`);
                }

                console.log(`Page ${i} base64 sample:`, base64.slice(0, 50));
                console.log(`Page ${i} buffer length:`, buffer.length);

                // Debug: Save the image for inspection
                await import('fs').then(fs => fs.promises.writeFile(`/tmp/debug-page-${i}.png`, buffer));
                console.log(`Saved debug image for page ${i} to /tmp/debug-page-${i}.png`);

                pages.push(imageDataUrl);
                i++;
            } catch (error) {
                console.error('Error generating image for page', i, ':', error.message);
                break;
            }
        }

        if (pages.length === 0) {
            throw new Error('No pages converted - PDF may be empty or invalid');
        }

        console.log('Total pages:', pages.length);
        return pages;
    } catch (error) {
        console.error('Error in generating images from PDF:', error.message);
        throw new Error(`Error in generating images from PDF: ${error.message}`);
    }
}

export { generateImages };