import json
import sys
import base64
import fitz  # PyMuPDF
sys.stdout.reconfigure(line_buffering=True)

def redact_pdf(pdf_base64, pii_data, pii_data_to_redact):
    try:
        # Decode the base64 PDF data
        pdf_bytes = base64.b64decode(pdf_base64)
    except base64.binascii.Error as e:
        raise ValueError(f"Invalid base64 PDF data: {str(e)}")

    # Open the PDF in memory
    try:
        pdf = fitz.open("pdf", pdf_bytes)
    except Exception as e:
        raise ValueError(f"Failed to open PDF: {str(e)}")

    try:
        # Process each page for redaction
        for page_data in pii_data:
            # Validate page_data structure
            if not isinstance(page_data, dict) or 'page' not in page_data or 'pii' not in page_data:
                continue

            page_num = page_data['page'] - 1
            if page_num < 0 or page_num >= len(pdf):
                continue  # Skip invalid page numbers

            page = pdf[page_num]

            for pii in page_data['pii']['pii']:

                # Validate pii structure
                if not isinstance(pii, dict) or 'value' not in pii:
                    continue

                #print(f"PII Entry: ", pii.get('value'))
                text = pii['value']
                type = pii['type']

                if type not in pii_data_to_redact:
                     continue

                if not text or len(text) < 2:
                    continue  # Skip empty or invalid text

                # Search for the text and redact
                instances = page.search_for(text)

                for inst in instances:
                    page.draw_rect(inst, color=(0, 0, 0), fill=(0, 0, 0))
                    page.add_redact_annot(inst)
            page.apply_redactions()

        # Scrub metadata and save to memory
        pdf.scrub()
        redacted_bytes = pdf.write(clean=True)

        # Encode the redacted PDF as base64
        redacted_base64 = base64.b64encode(redacted_bytes).decode('utf-8')
        return redacted_base64
    finally:
        pdf.close()

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            raise ValueError("No input data provided")

        # Parse the input JSON
        data = json.loads(input_data)

        # Extract PDF and PII data
        pdf_base64 = data['pdfBase64']
        pii_json_str = data['piiJson']  # This is a JSON string
        pii_json_to_redact_str = data['piiToRedactJson']  # This is a JSON string

        # Validate inputs
        if not pdf_base64:
            raise ValueError("Missing pdfBase64")
        if not pii_json_str:
            raise ValueError("Missing piiJson")
        if not pii_json_to_redact_str:
             raise ValueError("Missing piiJsonToRedact")

        # Parse the piiJson string into a Python object (list of dicts)
        pii_data = json.loads(pii_json_str)

        # Parse the piiJsonToRedact string into a Python object (list of dicts)
        pii_data_to_redact = json.loads(pii_json_to_redact_str)
        # Redact the PDF in memory
        redacted_base64 = redact_pdf(pdf_base64, pii_data, pii_data_to_redact)

        # Output the result as JSON to stdout
        output = {"redactedBase64": redacted_base64}
        print(json.dumps(output))
    except Exception as e:
        # Output error to stderr
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)