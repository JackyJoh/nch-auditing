import csv
from io import BytesIO
from flask import send_file

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

def to_vcf(file_obj, name_column, number_column):
    """
    file_obj: file-like object (e.g., from Flask request.files['contactSheet'])
    name_column: str, column header for contact name
    number_column: str, column header for phone number
    Returns: Flask response to download VCF file
    """
    try:
        # Read CSV from file-like object
        file_obj.seek(0)
        decoded = file_obj.read().decode('utf-8')
        reader = csv.DictReader(decoded.splitlines())
        vcf_lines = []
        contact_count = 0

        # Check if required columns exist
        if name_column not in reader.fieldnames or number_column not in reader.fieldnames:
            raise ValueError(f"CSV missing required columns: {reader.fieldnames}. Expected: '{name_column}' and '{number_column}'.")

        for row in reader:
            name = row[name_column].strip()
            number = row[number_column].strip()
            if name and number:
                vcard_text = create_vcard_block(name, number)
                vcf_lines.append(vcard_text)
                contact_count += 1

        vcf_content = ''.join(vcf_lines)
        vcf_bytes = vcf_content.encode('utf-8')
        vcf_io = BytesIO(vcf_bytes)
        vcf_io.seek(0)
        return send_file(
            vcf_io,
            mimetype='text/vcard',
            as_attachment=True,
            download_name='contacts.vcf'
        )

    except Exception as e:
        raise RuntimeError(f"VCF generation failed: {e}")
