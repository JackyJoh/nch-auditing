import pandas as pd
from typing import List, Dict, Tuple

def merge_care_gap_sheets(master_file, care_gap_files_with_configs: List[Tuple], db):
    """
    Merge multiple care gap sheets into the master sheet.
    
    Args:
        master_file: The master Excel file (file object or path)
        care_gap_files_with_configs: List of tuples [(file, config_id), (file, config_id), ...]
        db: MongoDB database connection to fetch configs
    
    Returns:
        bytes: The merged Excel file as bytes for download
    """
    from bson import ObjectId
    from io import BytesIO
    
    # Fetch gaps file from database
    gaps_doc = db.system_files.find_one({"file_type": "gaps"})
    if not gaps_doc:
        raise Exception("Gaps file not found in database. Please upload it in Settings.")
    
    gaps = pd.DataFrame(gaps_doc['data'])
    
    # Read master file (handle FileStorage object)
    # Support both Excel and CSV
    if master_file.filename.endswith('.csv'):
        master = pd.read_csv(BytesIO(master_file.read()))
    else:
        master = pd.read_excel(BytesIO(master_file.read()))
    master_file.seek(0)  # Reset file pointer
    
    cols = ["First Name", "Last Name", "Member ID", "Care Gap", "DOB", "Insurance", "Doctor/Provider", "Notes"]
    
    # If master has the right columns, use it; otherwise start fresh
    if all(col in master.columns for col in cols):
        masterFrame = master[cols].copy()
        print(f"Starting with {len(masterFrame)} rows from master file")
    else:
        masterFrame = pd.DataFrame(columns=cols)
        print("Master file doesn't have expected columns, starting fresh")
    
    # Create array of dataframes and fetch configs
    all_dfs = []
    configs_list = []
    total_rows = 0 
    
    for file, config_id in care_gap_files_with_configs:
        # Read the Excel/CSV file (handle FileStorage object)
        if file.filename.endswith('.csv'):
            temp = pd.read_csv(BytesIO(file.read()))
        else:
            temp = pd.read_excel(BytesIO(file.read()))
        file.seek(0)  # Reset file pointer
        all_dfs.append(temp)
        total_rows += len(temp)
        
        # Fetch the config from MongoDB
        config = db.insurance.find_one({"_id": ObjectId(config_id)})
        if config:
            configs_list.append(config['fields'])  # Get the fields dict
    
    # Convert configs list to DataFrame matching original script structure
    masterCols = pd.DataFrame(configs_list)
    
    # Create temporary frame for new data only
    newDataFrame = pd.DataFrame(columns=cols)

    # Helper function to find column case-insensitively
    def find_column(df, col_name):
        """Find column in dataframe case-insensitively"""
        if pd.isna(col_name) or str(col_name).lower() == "none":
            return None
        
        col_name_lower = str(col_name).lower().strip()
        
        # Try exact match first
        if col_name in df.columns:
            return col_name
        
        # Try case-insensitive match
        for col in df.columns:
            if str(col).lower().strip() == col_name_lower:
                return col
        
        return None

    # Process each dataframe
    for idx, df in enumerate(all_dfs):
        # Extract column names from masterCols DataFrame (same as original)
        first_col = find_column(df, masterCols["First Name"][idx])
        last_col = find_column(df, masterCols["Last Name"][idx])
        id_col = find_column(df, masterCols["Member ID"][idx])
        gap_col = find_column(df, masterCols["Care Gap"][idx])
        dob_col = find_column(df, masterCols["DOB"][idx])
        doctor_col = find_column(df, masterCols["Doctor/Provider"][idx])
        insurance_col = find_column(df, masterCols["Insurance"][idx])
        check_insurance = masterCols["Insurance Provided"][idx]
        note_col = find_column(df, masterCols["Notes"][idx])
        name_col = find_column(df, masterCols["Full Name"][idx])
        
        # Check for first/last or fullname
        has_full_name = name_col is not None
        
        # Process all rows at once where possible
        if has_full_name:
            # Process full names
            df_copy = df.copy()
            df_copy['First'] = df_copy[name_col].str.split(',').str[1].str.strip().str.split().str[0]
            df_copy['Last'] = df_copy[name_col].str.split(',').str[0].str.strip()
        else:
            df_copy = df.copy()
            df_copy['First'] = df[first_col] if first_col is not None else ""
            df_copy['Last'] = df[last_col] if last_col is not None else ""
        
        # Handle insurance
        if check_insurance == "No":
            df_copy['Insurance'] = masterCols["Insurance"][idx]
        else:
            df_copy['Insurance'] = df[insurance_col] if insurance_col is not None else "N/A"
        
        # Handle doctor/provider
        df_copy['Doctor'] = df[doctor_col] if doctor_col is not None else "N/A"
        
        # Handle notes
        df_copy['Notes'] = df[note_col] if note_col is not None else "N/A"
        
        # Check if care gap exists
        if gap_col is not None and id_col is not None and dob_col is not None:
            subset_df = pd.DataFrame({
                "First Name": df_copy['First'],
                "Last Name": df_copy['Last'],
                "Member ID": df_copy[id_col].astype(str),
                "Care Gap": df_copy[gap_col].astype(str),
                "DOB": df_copy[dob_col],
                "Insurance": df_copy['Insurance'],
                "Doctor/Provider": df_copy['Doctor'],
                "Notes": df_copy['Notes']
            })
            
            # Concat to NEW data frame, not master
            newDataFrame = pd.concat([newDataFrame, subset_df], ignore_index=True)
    
    # Remove nonmapped entries from NEW data only
    def find_header(gap_name, df=gaps):
        # Iterate through each column
        gap_name = f"{gap_name}"

        for col in df.columns:
            # Check each value in the column
            for value in df[col].dropna():
                # If gap name is found
                if gap_name.upper() == str(value).upper():
                    return col
        return "X"
    
    def reduce(id):
        id = f"{id}"
        return id[0:6]
    
    # Process new data
    care_gaps = newDataFrame['Care Gap'].unique()
    header_mapping = {gap: find_header(gap) for gap in care_gaps}

    newDataFrame['Care Gap'] = newDataFrame['Care Gap'].map(header_mapping)
    newDataFrame = newDataFrame[newDataFrame['Care Gap'] != "X"]
    newDataFrame.loc[:, 'Member ID'] = newDataFrame['Member ID'].apply(lambda x: reduce(x))
    
    # Remove duplicates within new data
    newDataFrame = newDataFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'Member ID', 'Last Name'], keep='first')
    newDataFrame = newDataFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'DOB', 'Last Name'], keep='first')

    print(f"New data after deduplication: {len(newDataFrame)} rows")
    
    # Append new data to master, keeping master's existing rows
    masterFrame = pd.concat([masterFrame, newDataFrame], ignore_index=True)
    
    # Final deduplication - remove any from new data that already exist in master
    # Keep 'first' which preserves master file rows
    masterFrame = masterFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'Member ID', 'Last Name'], keep='first')
    masterFrame = masterFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'DOB', 'Last Name'], keep='first')

    print(f"Final merged data: {len(masterFrame)} rows (added {len(masterFrame) - len(master) if len(master) > 0 else len(masterFrame)} new rows)")

    # Return as bytes for download
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        masterFrame.to_excel(writer, index=False, sheet_name='Merged Care Gaps')
    output.seek(0)
    return output.read()
