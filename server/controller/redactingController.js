const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function redactPdfWithPII(dataUrl, piiResults, piiToRedact) {
    return new Promise((resolve, reject) => {
        try {
            // Validate input
            if (!dataUrl || !dataUrl.startsWith('data:application/pdf;base64,')) {
                throw new Error('Invalid dataUrl format');
            }
            if (!Array.isArray(piiResults)) {
                throw new Error('piiResults must be an array');
            }

            if (!Array.isArray(piiToRedact)) { 
                throw new Error('piiToRedact must contain only strings');
            }

            // Extract the base64 PDF data
            const pdfBase64 = dataUrl.split(',')[1];
            const piiJson = JSON.stringify(piiResults);
            const piiToRedactJson = JSON.stringify(piiToRedact);
            // Prepare the input data as JSON
            const inputData = JSON.stringify({ pdfBase64, piiJson, piiToRedactJson});
            console.log('Input data size:', inputData.length);

            // Define absolute paths to redact.py and the virtual environment's Python
            const baseDir = path.resolve(__dirname, '../../'); // Resolve to project root
            const scriptPath = path.join(baseDir, 'server/controller/redact.py');
            const pythonPath = path.join(baseDir, 'venv/bin/python3');
            console.log('Using Python at:', pythonPath);
            console.log('Using redact.py at:', scriptPath);

            // Spawn the Python process
            const pythonProcess = spawn(pythonPath, [scriptPath]);

            // Variables to collect stdout and stderr
            let stdoutData = '';
            let stderrData = '';

            // Collect stdout data
            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            // Collect stderr data
            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            // Handle process exit
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python script stderr:', stderrData);
                    return reject(new Error(`Redaction failed with exit code ${code}: ${stderrData}`));
                }

                // Parse the output
                try {
                    const output = JSON.parse(stdoutData);
                    if (!output.redactedBase64) {
                        return reject(new Error('Redaction script did not return redacted PDF'));
                    }

                    const redactedDataUrl = `data:application/pdf;base64,${output.redactedBase64}`;
                    console.log('Redacted PDF dataUrl:', redactedDataUrl.slice(0, 50));

                    resolve(redactedDataUrl);
                } catch (parseError) {
                    console.error('Error parsing Python script output:', parseError);
                    reject(new Error(`Failed to parse redaction output: ${parseError.message}`));
                }
            });

            // Handle process errors (e.g., Python executable not found)
            pythonProcess.on('error', (error) => {
                console.error('Failed to spawn Python process:', error);
                reject(new Error(`Failed to spawn Python process: ${error.message}`));
            });

            // Write input data to stdin
            pythonProcess.stdin.write(inputData);
            pythonProcess.stdin.end();
        } catch (error) {
            console.error('Error in redactPdfWithPII:', error);
            reject(new Error(`Redaction failed in redactPdfWithPII: ${error.message}`));
        }
    });
}

module.exports = { redactPdfWithPII };