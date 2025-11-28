import pandas as pd
from typing import List, Dict, Tuple
import base64
from io import BytesIO
import json

def merge_care_gap_sheets_lambda(master_file_bytes, master_filename, care_gap_files, gaps_data, gaps_columns, enable_to_be_removed):
    # Reconstruct gaps DataFrame
    gaps = pd.DataFrame(gaps_data, columns=gaps_columns)

    # Read master file
    if master_filename.endswith('.csv'):
        master = pd.read_csv(BytesIO(base64.b64decode(master_file_bytes)))
    else:
        master = pd.read_excel(BytesIO(base64.b64decode(master_file_bytes)))

    # Handle "To be removed" logic if enabled
    if enable_to_be_removed and 'To be removed' in master.columns:
        mask = master["To be removed"].astype(str).str.contains("y", case=False, na=False)
        master = master.loc[~mask].copy()
        master = master.drop(columns=['To be removed'])

    cols = ["First Name", "Last Name", "Member ID", "Care Gap", "DOB", "Insurance", "Doctor/Provider", "Notes"]

    if all(col in master.columns for col in cols):
        masterFrame = master[cols].copy()
    else:
        masterFrame = pd.DataFrame(columns=cols)

    all_dfs = []
    configs_list = []

    for care_gap_file in care_gap_files:
        file_bytes = base64.b64decode(care_gap_file['file'])
        filename = care_gap_file['filename']
        config_fields = care_gap_file['config_fields']

        if filename.endswith('.csv'):
            temp = pd.read_csv(BytesIO(file_bytes))
        else:
            temp = pd.read_excel(BytesIO(file_bytes))
        all_dfs.append(temp)
        configs_list.append(config_fields)

    masterCols = pd.DataFrame(configs_list)
    newDataFrame = pd.DataFrame(columns=cols)

    def find_column(df, col_name):
        if pd.isna(col_name) or str(col_name).lower() == "none":
            return None
        col_name_lower = str(col_name).lower().strip()
        if col_name in df.columns:
            return col_name
        for col in df.columns:
            if str(col).lower().strip() == col_name_lower:
                return col
        return None

    for idx, df in enumerate(all_dfs):
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

        has_full_name = name_col is not None

        if has_full_name:
            df_copy = df.copy()
            df_copy['First'] = df_copy[name_col].str.split(',').str[1].str.strip().str.split().str[0]
            df_copy['Last'] = df_copy[name_col].str.split(',').str[0].str.strip()
        else:
            df_copy = df.copy()
            df_copy['First'] = df[first_col] if first_col is not None else ""
            df_copy['Last'] = df[last_col] if last_col is not None else ""

        if check_insurance == "No":
            df_copy['Insurance'] = masterCols["Insurance"][idx]
        else:
            df_copy['Insurance'] = df[insurance_col] if insurance_col is not None else "N/A"

        df_copy['Doctor'] = df[doctor_col] if doctor_col is not None else "N/A"
        df_copy['Notes'] = df[note_col] if note_col is not None else "N/A"

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
            newDataFrame = pd.concat([newDataFrame, subset_df], ignore_index=True)

    def find_header(gap_name, df=gaps):
        gap_name = f"{gap_name}"
        for col in df.columns:
            for value in df[col].dropna():
                if gap_name.upper() == str(value).upper():
                    return col
        return "X"

    def reduce(id):
        id = f"{id}"
        return id[0:6]

    care_gaps = newDataFrame['Care Gap'].unique()
    header_mapping = {gap: find_header(gap) for gap in care_gaps}

    newDataFrame['Care Gap'] = newDataFrame['Care Gap'].map(header_mapping)
    newDataFrame = newDataFrame[newDataFrame['Care Gap'] != "X"]
    newDataFrame.loc[:, 'Member ID'] = newDataFrame['Member ID'].apply(lambda x: reduce(x))

    newDataFrame = newDataFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'Member ID', 'Last Name'], keep='first')
    newDataFrame = newDataFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'DOB', 'Last Name'], keep='first')

    masterFrame = pd.concat([masterFrame, newDataFrame], ignore_index=True)
    masterFrame = masterFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'Member ID', 'Last Name'], keep='first')
    masterFrame = masterFrame.drop_duplicates(subset=['Care Gap', 'First Name', 'DOB', 'Last Name'], keep='first')

    if enable_to_be_removed:
        masterFrame['To be removed'] = ""

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        masterFrame.to_excel(writer, index=False, sheet_name='Merged Care Gaps')
    output.seek(0)
    return output.read()

def lambda_handler(event, context):
    try:
        master_file_bytes = event['master_file']
        master_filename = event['master_filename']
        care_gap_files = event['care_gap_files']
        gaps_data = event['gaps_data']
        gaps_columns = event['gaps_columns']
        enable_to_be_removed = event['enable_to_be_removed']

        merged_file = merge_care_gap_sheets_lambda(
            master_file_bytes,
            master_filename,
            care_gap_files,
            gaps_data,
            gaps_columns,
            enable_to_be_removed
        )
        return {
            "status": "success",
            "merged_file": base64.b64encode(merged_file).decode()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
