import pandas as pd
import zipfile
from io import BytesIO
import gc
import boto3
import json
from datetime import datetime
import re # For cleaning filenames

# NOTE: This code assumes the Lambda execution environment has the necessary
# libraries installed (Pandas, PyMongo, openpyxl, etc.) via a Container Image or Layer.

# --- HELPER CLASS ---
# Used to wrap the file bytes and retain the original filename
class FileObj(BytesIO):
    def __init__(self, bytes_data, filename):
        super().__init__(bytes_data)
        self.filename = filename

def extract_name(filename):
    """
    Extract (first, last) from a PDF filename.

    Rules:
    - Handles "LAST, FIRST ..." (comma) format.
    - Otherwise uses the first token as FIRST.
    - Finds LAST as the first subsequent token that:
        - is not a single-letter initial (with optional dot)
        - does not contain digits (dates)
        - contains alphabetic characters
    - Falls back to reasonable defaults if needed.
    """
    # remove extension and normalize separators
    base = filename.rsplit('.', 1)[0].strip()
    base = base.replace('_', ' ').replace('-', ' ')
    
    # quick helper to clean a token to letters only (keep hyphen)
    def clean_token(tok: str) -> str:
        return re.sub(r"[^A-Za-z\-']", "", tok).strip()

    # If comma format: "LAST, FIRST ..."
    if ',' in base:
        left, right = base.split(',', 1)
        last = clean_token(left)
        # find first valid token in right part as first name
        for tok in re.split(r'\s+', right.strip()):
            c = clean_token(tok)
            if not c:
                continue
            # skip single-letter initials
            if re.fullmatch(r"[A-Za-z]", c):
                continue
            return c.lower(), last.lower()
        # fallback: take first word from right part
        first_fallback = clean_token(re.split(r'\s+', right.strip())[0]) if right.strip() else ""
        return (first_fallback.lower(), last.lower()) if first_fallback else ("", last.lower())

    parts = re.split(r'\s+', base)
    if not parts:
        return "", ""

    # first name is first token cleaned
    first = clean_token(parts[0]).lower()

    # find last name: first token after the first that is not an initial or date/proc
    last = ""
    for tok in parts[1:]:
        # skip tokens that contain digits (dates, version numbers)
        if re.search(r'\d', tok):
            continue
        # clean token
        c = clean_token(tok)
        if not c:
            continue
        # skip single-letter initials like "T" or "T."
        if re.fullmatch(r"[A-Za-z]", c):
            continue
        # token looks like a valid last name
        last = c.lower()
        break

    # if no last found yet, try backwards scan for a suitable token
    if not last:
        for tok in reversed(parts[1:]):
            if re.search(r'\d', tok):
                continue
            c = clean_token(tok)
            if not c or re.fullmatch(r"[A-Za-z]", c):
                continue
            last = c.lower()
            break

    # final fallback: use second token cleaned if exists
    if not last and len(parts) >= 2:
        last = clean_token(parts[1]).lower()

    return (first or "", last or "")

# --- CORE PROCESSING LOGIC ---

def sort_pdfs(master_file, pdf_files):
    """
    Sorts PDFs based on the master care gap sheet by matching First Name and Last Name.
    The master sheet is assumed to have clean, two-part names (First, Last).
    
    Args:
        master_file: FileObj containing the Excel/CSV master data.
        pdf_files: List of FileObj containing PDF file bytes.
    
    Returns:
        bytes: The final sorted ZIP file as bytes.
    """
    try:
        # Read master file into DataFrame (dtype=str prevents NaN issues)
        if master_file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(master_file.read()), dtype=str)
        else:
            # Use the BytesIO wrapper to read the file in memory
            df = pd.read_excel(BytesIO(master_file.read()), dtype=str, engine='openpyxl')
        
        print(f"Master file loaded: {len(df)} rows")
        
        # Build name-to-insurance dictionary: Key is a tuple (first_name, last_name)
        name_to_ins = {}
        insurance_folders = set()
        for _, row in df.iterrows():
            first = str(row.get("First Name", "")).strip().lower()
            last = str(row.get("Last Name", "")).strip().lower()
            ins = str(row.get("Insurance", "Unknown")).strip()
            
            if ins:
                # sanitize insurance folder name once and collect
                folder = "".join(c for c in ins if c.isalnum() or c in (' ', '_', '-')).strip()
                if folder:
                    insurance_folders.add(folder)
            
            if first and last and ins:
                name_to_ins[(first, last)] = ins

        # Ensure Unmatched folder exists
        insurance_folders.add("Unmatched")

        # Create in-memory ZIP buffer to build the final output
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Pre-create empty folder entries for every insurance (so folders appear in zip)
            for folder in sorted(insurance_folders):
                # a directory entry in zip is a name that ends with '/'
                zip_file.writestr(f"{folder}/", b'')
            
            batch_size = 50
            
            # Process PDFs in batches for memory management
            for i in range(0, len(pdf_files), batch_size):
                batch = pdf_files[i:i + batch_size]
                print(f"Processing batch {i//batch_size + 1}: {len(batch)} files")
                
                for pdf in batch:
                    try:
                        pdf_content = pdf.read()
                        filename = pdf.filename
                        
                        first, last = extract_name(filename)
                        ins = name_to_ins.get((first, last))
                        
                        if ins:
                            # Sanitize insurance name for folder path
                            folder_name = "".join(c for c in ins if c.isalnum() or c in (' ', '_', '-')).strip()
                            zip_path = f"{folder_name}/{filename}"
                        else:
                            zip_path = f"Unmatched/{filename}"
                        
                        # Add file content to the ZIP buffer
                        zip_file.writestr(zip_path, pdf_content)
                        del pdf_content
                        
                    except Exception as e:
                        print(f"Error processing {pdf.filename}: {str(e)}")
                        continue

                # Force garbage collection after each batch to manage Lambda memory
                gc.collect()
        
        zip_buffer.seek(0)
        return zip_buffer.read()
        
    except Exception as e:
        print(f"FATAL ERROR IN SORT_PDFS: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

# --- LAMBDA HANDLER ---

def lambda_handler(event, context):
    """
    Main entry point for AWS Lambda.
    Downloads input files from S3, executes sort_pdfs, and uploads the result ZIP back to S3.
    """
    try:
        # Check for required input keys from Flask payload
        s3_bucket = event['s3_bucket']
        master_s3_key = event['master_s3_key']
        pdf_files_data = event['pdf_files']

        s3_client = boto3.client('s3')

        # 1. Download Master File
        master_file_obj = BytesIO()
        s3_client.download_fileobj(s3_bucket, master_s3_key, master_file_obj)
        master_file_obj.seek(0)
        master_file = FileObj(master_file_obj.getvalue(), master_s3_key.split('/')[-1])

        # 2. Download all PDF Files
        pdf_files = []
        for pdf in pdf_files_data:
            pdf_obj = BytesIO()
            # pdf['s3_key'] contains the path to the individual PDF
            s3_client.download_fileobj(s3_bucket, pdf['s3_key'], pdf_obj)
            pdf_obj.seek(0)
            # Store file bytes and original filename in the custom FileObj class
            pdf_files.append(FileObj(pdf_obj.getvalue(), pdf['filename']))
            
        # 3. Process the files (the heavy lifting)
        sorted_zip_bytes = sort_pdfs(master_file, pdf_files)

        # 4. Upload the final ZIP to S3
        result_s3_key = f"results/sorted_pdfs_{datetime.now().strftime('%Y%m%dT%H%M%S')}.zip"
        zip_obj = BytesIO(sorted_zip_bytes)
        
        # Upload the ZIP file to S3
        s3_client.upload_fileobj(zip_obj, s3_bucket, result_s3_key)

        # 5. Return success status and the S3 key
        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "s3_key": result_s3_key
            })
        }
    except Exception as e:
        # Use traceback to ensure the full error path is logged to CloudWatch
        import traceback
        print(f"LAMBDA EXECUTION FAILED: {traceback.format_exc()}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "error": str(e),
                "trace": traceback.format_exc().splitlines()[-1]
            })
        }