import csv
import json
import traceback
import base64
from io import BytesIO, StringIO
import pandas as pd

# Increase CSV field size limit to handle large fields
csv.field_size_limit(10 * 1024 * 1024)  # 10MB limit

def create_vcard_block(name, phone_number):
   
    # Strip whitespace and use split
    # string is split only ONCE at the first space.
    name_parts = name.strip().split(' ', 1)
    
    # Initialize variables
    last_name = name_parts[0] if name_parts else ''
    first_name = name_parts[1] if len(name_parts) > 1 else ''
    
    # 2. Escape common VCF special characters
    formatted_name = name.replace(';', '\\;')
    
    # 3. Construct the VCF block
    vcard = (
        f"BEGIN:VCARD\n"
        f"VERSION:3.0\n"
        # FN (Formatted Name) remains the original, as it's the full display name
        f"FN:{formatted_name}\n"
        # N (Name structure) is formatted as: Last Name;First Name;Middle Name;Prefix;Suffix
        f"N:{last_name};{first_name};;;\n" 
        # TEL (Telephone) type is set to CELL
        f"TEL;TYPE=CELL:{phone_number}\n"
        f"END:VCARD\n"
    )
    return vcard

def generate_vcf_content(file_obj, name_column, number_column):
    """
    Generate VCF content from file object.
    Returns: tuple (vcf_content_bytes, contact_count)
    """
    try:
        # Check if CSV or XLSX
        filename = getattr(file_obj, 'filename', getattr(file_obj, 'name', ''))
        
        # Read the file content first
        file_obj.seek(0)
        file_content = file_obj.read()
        file_obj.seek(0)
        
        # Determine file type and read data
        if filename.endswith('.csv'):
            # Handle CSV files
            decoded = file_content.decode('utf-8')
            reader = csv.DictReader(decoded.splitlines())
        else:
            # Handle Excel files
            try:
                df = pd.read_excel(BytesIO(file_content), engine='openpyxl')
                csv_io = StringIO()
                df.to_csv(csv_io, index=False)
                csv_io.seek(0)
                reader = csv.DictReader(csv_io)
            except Exception as excel_error:
                # If Excel reading fails, try as CSV
                print(f"Excel read failed, trying as CSV: {excel_error}")
                decoded = file_content.decode('utf-8')
                reader = csv.DictReader(decoded.splitlines())
        
        # Check if required columns exist
        if name_column not in reader.fieldnames or number_column not in reader.fieldnames:
            raise ValueError(f"CSV missing required columns: {reader.fieldnames}. Expected: '{name_column}' and '{number_column}'.")

        vcf_lines = []
        contact_count = 0
        
        # set for duplicate checking
        seen_contacts = set()
        for row in reader:
            name = row[name_column].strip()
            number = row[number_column].strip()
            if name and number:
                # Normalize for duplicate checking (remove common separators)
                normalized_number = ''.join(c for c in number if c.isdigit())
                contact_key = (name.lower(), normalized_number)
                if contact_key in seen_contacts:
                    continue  # skip duplicates
                vcard_text = create_vcard_block(name, number)
                vcf_lines.append(vcard_text)
                contact_count += 1
                seen_contacts.add(contact_key)

        vcf_content = ''.join(vcf_lines)
        vcf_bytes = vcf_content.encode('utf-8')
        
        return vcf_bytes, contact_count

    except Exception as e:
        raise RuntimeError(f"VCF generation failed: {e}")

def lambda_handler(event, context):
    """
    Main entry point for AWS Lambda.
    Expects event with:
    - file_content: base64-encoded file from Flask
    - filename: original filename
    - name_column: column name for contact names
    - number_column: column name for phone numbers
    """
    try:
        # Parse the event body (Flask sends it directly, not through API Gateway)
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        # Get file content - it's already base64 from Flask, just decode once
        file_content = body.get('file_content', '')
        if isinstance(file_content, str):
            file_content = base64.b64decode(file_content)
        
        file_obj = BytesIO(file_content)
        file_obj.name = body.get('filename', 'contacts.csv')
        
        name_column = body['name_column']
        number_column = body['number_column']
        
        # Generate VCF content
        vcf_bytes, contact_count = generate_vcf_content(file_obj, name_column, number_column)
        
        # Return response with base64-encoded content for Flask
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/vcard",
                "Content-Disposition": "attachment; filename=contacts.vcf"
            },
            "body": base64.b64encode(vcf_bytes).decode('utf-8'),
            "isBase64Encoded": True
        }

    except Exception as e:
        print(f"LAMBDA EXECUTION FAILED: {traceback.format_exc()}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "status": "error",
                "error": str(e),
                "trace": traceback.format_exc()
            })
        }