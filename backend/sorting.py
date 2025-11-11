import pandas as pd
from typing import List, Dict
from pathlib import Path
import shutil
import os
import zipfile
from io import BytesIO
import gc  # Garbage collection

def sort_pdfs(master_file, pdf_files):
    """
    Sort PDFs based on the master care gap sheet.
    
    Args:
        master_file: Excel file containing care gap data
        pdf_files: List of PDF file objects from Flask
    
    Returns:
        bytes: ZIP file containing sorted PDFs as bytes for download
    """
    try:
        # Read master file with minimal memory
        if master_file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(master_file.read()), dtype=str)
        else:
            df = pd.read_excel(BytesIO(master_file.read()), dtype=str, engine='openpyxl')
        master_file.seek(0)
        
        print(f"Master file loaded: {len(df)} rows")
        
        # Create in-memory ZIP
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Process PDFs in smaller batches to avoid memory issues
            batch_size = 50
            for i in range(0, len(pdf_files), batch_size):
                batch = pdf_files[i:i + batch_size]
                print(f"Processing batch {i//batch_size + 1}: {len(batch)} files")
                
                for pdf in batch:
                    try:
                        # Read PDF content
                        pdf_content = pdf.read()
                        pdf.seek(0)
                        
                        # Extract member ID from filename
                        filename = pdf.filename
                        member_id = filename.split('_')[0] if '_' in filename else filename.replace('.pdf', '')
                        
                        # Find matching row (use vectorized operation instead of iterrows)
                        mask = df.astype(str).apply(lambda x: x.str.contains(member_id, case=False, na=False)).any(axis=1)
                        matching_rows = df[mask]
                        
                        if not matching_rows.empty:
                            # Get folder name from first matching row
                            row = matching_rows.iloc[0]
                            folder_name = f"{row.get('Insurance', 'Unknown')}_{row.get('Care Gap', 'Unknown')}"
                            folder_name = "".join(c for c in folder_name if c.isalnum() or c in (' ', '_', '-')).strip()
                            zip_path = f"{folder_name}/{filename}"
                        else:
                            zip_path = f"Unmatched/{filename}"
                        
                        # Add to ZIP
                        zip_file.writestr(zip_path, pdf_content)
                        
                        # Clear memory
                        del pdf_content
                        
                    except Exception as e:
                        print(f"Error processing {pdf.filename}: {str(e)}")
                        continue
                
                # Force garbage collection after each batch
                gc.collect()
        
        zip_buffer.seek(0)
        return zip_buffer.read()
        
    except Exception as e:
        print(f"Error in sort_pdfs: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

