import pandas as pd
from typing import List, Dict
from pathlib import Path
import shutil
import os
import zipfile
from io import BytesIO

def sort_pdfs(master_file, pdf_files):
    """
    Sort PDFs based on the master care gap sheet.
    
    Args:
        master_file: Excel file containing care gap data
        pdf_files: List of PDF file objects from Flask
    
    Returns:
        bytes: ZIP file containing sorted PDFs as bytes for download
    """
    from io import BytesIO
    import tempfile
    
    # Read the master care gap sheet - support both Excel and CSV
    if master_file.filename.endswith('.csv'):
        df = pd.read_csv(BytesIO(master_file.read()), dtype=str)
    else:
        df = pd.read_excel(BytesIO(master_file.read()), dtype=str)
    master_file.seek(0)
    
    # Build the name -> insurance mapping
    key2 = {}
    for index, row in df.iterrows():
        first = row["First Name"]
        last = row["Last Name"]
        ins = row["Insurance"]
        name = f"{first} {last}"
        if name.lower() in key2:
            if key2[name.lower()] == "nan":
                key2[name.lower()] = ins
        else:
            key2[name.lower()] = ins
    
    # Create a temporary directory for sorting
    temp_dir = tempfile.mkdtemp()
    
    try:
        count = 0
        unique = set()
        
        # Process each PDF file
        for pdf_file in pdf_files:
            filename = pdf_file.filename
            
            # Extract just the filename, remove any path components
            filename = Path(filename).name
            
            # Remove .pdf extension
            if filename.endswith('.pdf'):
                name_without_ext = filename[:-4]
            else:
                name_without_ext = filename
            
            # Extract first and last name, skipping middle initials/names
            name_parts = name_without_ext.split()
            
            if len(name_parts) >= 2:
                first = name_parts[0]
                
                # Find the last name by skipping middle initials (single letter or letter+period)
                last = None
                for i in range(1, len(name_parts)):
                    part = name_parts[i]
                    # Check if it's a middle initial (single letter or letter with period)
                    if len(part) <= 2 and (len(part) == 1 or part.endswith('.')):
                        continue  # Skip middle initials
                    else:
                        last = part
                        break
                
                # If we found a last name, use it; otherwise use the second part
                if last:
                    name = f"{first} {last}"
                else:
                    name = f"{first} {name_parts[1]}"
            else:
                name = name_without_ext
            
            # Check if name is in the mapping
            if name.lower() in key2:
                ins = key2[name.lower()]
                ins = str(ins).split()[0]
                ins = ins[0:12]  # Truncate to 12 chars
                folder_name = ins
            else:
                folder_name = "Unsorted"  # Changed from "nan" to "Unsorted" for clarity
            
            # Create folder for this insurance
            folder_path = Path(temp_dir) / folder_name
            folder_path.mkdir(parents=True, exist_ok=True)
            unique.add(folder_name)
            
            # Save PDF to the folder - use ORIGINAL filename
            pdf_path = folder_path / Path(filename).name
            with open(pdf_path, 'wb') as f:
                pdf_file.seek(0)
                f.write(pdf_file.read())
            
            count += 1
        
        # Create a summary file
        summary_path = Path(temp_dir) / "Sorting_Summary.txt"
        with open(summary_path, 'w') as f:
            f.write(f"Number of folders created: {len(unique)}\n")
            f.write(f"Total PDFs sorted: {count}\n")
            f.write(f"\nFolders:\n")
            for folder in sorted(unique):
                f.write(f"  - {folder}\n")
        
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Walk through temp directory and add all files to zip
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_dir)
                    zip_file.write(file_path, arcname)
        
        zip_buffer.seek(0)
        return zip_buffer.read()
        
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir)

