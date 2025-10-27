from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId
from sorting import sort_pdfs
from merging import merge_care_gap_sheets

load_dotenv()

app = Flask(__name__)
CORS(app) 

# Establish MongoDB connection
mongo_uri = os.getenv("MONGO_URI")
mongo_client = None
db = None

if mongo_uri:
    try:
        mongo_client = MongoClient(mongo_uri)
        # Test the connection
        mongo_client.admin.command('ping')
        db = mongo_client['configs']  # Use a specific database name
        print("Connected to MongoDB successfully.")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        mongo_client = None
        db = None
else:
    print("MONGO_URI not found in environment variables.")

# Route for adding insurance configurations
@app.route('/api/insurance-configs', methods=['POST'])
def submit_json_to_mongo():
    
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    data_payload = request.json
    if not data_payload:
        return jsonify({"message": "Request body must contain valid JSON data."}), 400

    # Basic validation
    if not data_payload.get('name') or not data_payload.get('fields'):
        return jsonify({"message": "Name and fields are required."}), 400

    try:    
        collection = db.insurance
        
        # Add timestamp
        data_payload['created_at'] = datetime.utcnow()
        
        result = collection.insert_one(data_payload)
            
        return jsonify({
            "message": "Configuration added successfully.",
            "id": str(result.inserted_id)  # Changed to 'id' for consistency
        }), 201

    except Exception as e:
        return jsonify({"message": "MongoDB insertion failed.", "error": str(e)}), 500

# Route for retrieving insurance configurations
@app.route('/api/insurance-configs', methods=['GET'])
def get_insurance_configs():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        collection = db.insurance
        configs = list(collection.find())
        for config in configs:
            config['_id'] = str(config['_id'])  # Convert ObjectId to string
        return jsonify(configs), 200

    except Exception as e:
        return jsonify({"message": "MongoDB retrieval failed.", "error": str(e)}), 500
    
# Route for editing insurance configurations
@app.route('/api/insurance-configs/<config_id>', methods=['PUT'])
def edit_insurance_config(config_id):
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    data_payload = request.json
    if not data_payload:
        return jsonify({"message": "Request body must contain valid JSON data."}), 400

    try:
        collection = db.insurance
        result = collection.update_one(
            {"_id": ObjectId(config_id)},
            {"$set": data_payload}
        )

        if result.matched_count == 0:
            return jsonify({"message": "Configuration not found."}), 404

        return jsonify({"message": "Configuration updated successfully."}), 200

    except Exception as e:
        return jsonify({"message": "MongoDB update failed.", "error": str(e)}), 500
    
# Route for deleting insurance configurations
@app.route('/api/insurance-configs/<config_id>', methods=['DELETE'])
def delete_insurance_config(config_id):
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        collection = db.insurance
        result = collection.delete_one({"_id": ObjectId(config_id)})

        if result.deleted_count == 0:
            return jsonify({"message": "Configuration not found."}), 404

        return jsonify({"message": "Configuration deleted successfully."}), 200

    except Exception as e:
        return jsonify({"message": "MongoDB deletion failed.", "error": str(e)}), 500

# Route for uploading gaps file (one-time setup)
@app.route('/api/gaps-file', methods=['POST'])
def upload_gaps_file():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        gaps_file = request.files.get('gapsFile')
        if not gaps_file:
            return jsonify({"message": "Gaps file is required."}), 400
        
        print(f"Received file: {gaps_file.filename}")  # Debug
        
        from io import BytesIO
        import pandas as pd
        
        # Read and validate the file - support both Excel and CSV
        file_content = gaps_file.read()
        print(f"File size: {len(file_content)} bytes")  # Debug
        
        if gaps_file.filename.endswith('.csv'):
            gaps_df = pd.read_csv(BytesIO(file_content))
        else:
            gaps_df = pd.read_excel(BytesIO(file_content))
        print(f"DataFrame shape: {gaps_df.shape}")  # Debug
        
        # Convert to JSON for storage
        gaps_data = gaps_df.to_dict('records')
        
        # Store in MongoDB (replace existing if any)
        collection = db.system_files
        collection.delete_many({"file_type": "gaps"})
        collection.insert_one({
            "file_type": "gaps",
            "data": gaps_data,
            "columns": list(gaps_df.columns),
            "uploaded_at": datetime.utcnow()
        })
        
        print("Gaps file uploaded successfully")  # Debug
        return jsonify({"message": "Gaps file uploaded successfully."}), 201
        
    except Exception as e:
        print(f"Error uploading gaps file: {str(e)}")  # Debug
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"message": "Failed to upload gaps file.", "error": str(e)}), 500

# Route for retrieving gaps file info
@app.route('/api/gaps-file', methods=['GET'])
def get_gaps_file_info():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        collection = db.system_files
        gaps_file = collection.find_one({"file_type": "gaps"})
        
        if gaps_file:
            return jsonify({
                "exists": True,
                "uploaded_at": gaps_file.get("uploaded_at"),
                "row_count": len(gaps_file.get("data", []))
            }), 200
        else:
            return jsonify({"exists": False}), 200
            
    except Exception as e:
        return jsonify({"message": "Failed to retrieve gaps file info.", "error": str(e)}), 500

# Route for appending/merging care gap sheets
@app.route('/api/append-care-gaps', methods=['POST'])
def append_care_gaps():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        # Get the uploaded files
        master_file = request.files.get('masterFile')
        if not master_file:
            return jsonify({"message": "Master file is required."}), 400
        
        print(f"Master file received: {master_file.filename}")  # Debug
        
        # Get gaps file from database
        gaps_doc = db.system_files.find_one({"file_type": "gaps"})
        if not gaps_doc:
            return jsonify({"message": "Gaps file not found. Please upload it in Settings."}), 400
        
        print(f"Gaps file found in DB with {len(gaps_doc.get('data', []))} rows")  # Debug
        
        # Get care gap files and their config IDs
        care_gap_files_with_configs = []
        
        file_index = 0
        while True:
            file_key = f'careSheet_{file_index}'
            config_key = f'configId_{file_index}'
            
            care_file = request.files.get(file_key)
            config_id = request.form.get(config_key)
            
            print(f"Looking for {file_key}: {care_file.filename if care_file else None}, config: {config_id}")  # Debug
            
            if not care_file or not config_id:
                break
                
            care_gap_files_with_configs.append((care_file, config_id))
            file_index += 1
        
        print(f"Total care gap files: {len(care_gap_files_with_configs)}")  # Debug
        
        if len(care_gap_files_with_configs) == 0:
            return jsonify({"message": "At least one care gap sheet is required."}), 400
        
        # Call the merging function
        print("Calling merge_care_gap_sheets...")  # Debug
        merged_file_bytes = merge_care_gap_sheets(
            master_file,
            care_gap_files_with_configs,
            db
        )
        
        print(f"Merge complete, file size: {len(merged_file_bytes) if merged_file_bytes else 0} bytes")  # Debug
        
        if not merged_file_bytes:
            return jsonify({"message": "Merging returned empty file."}), 500
        
        # Send the merged file back as a download
        from io import BytesIO
        return send_file(
            BytesIO(merged_file_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='merged_care_gaps.xlsx'
        )
        
    except Exception as e:
        print(f"Error in append_care_gaps: {e}")
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"message": "Merging failed.", "error": str(e)}), 500
    
# Route for sorting PDFs
@app.route('/api/sort-pdfs', methods=['POST'])
def sort_pdfs_route():  # Changed function name to avoid conflict
    try:
        # Get the uploaded master file
        master_file = request.files.get('masterFile')
        if not master_file:
            return jsonify({"message": "Master file is required."}), 400
        
        print(f"Master file received: {master_file.filename}")  # Debug
        
        # Get the uploaded PDF files
        pdf_files = request.files.getlist('pdfFiles')
        if not pdf_files or len(pdf_files) == 0:
            return jsonify({"message": "At least one PDF file is required."}), 400
        
        print(f"Total PDF files received: {len(pdf_files)}")  # Debug
        
        # Call the sorting function
        print("Calling sort_pdfs...")  # Debug
        sorted_zip_bytes = sort_pdfs(
            master_file,
            pdf_files
        )
        
        print(f"Sorting complete, ZIP size: {len(sorted_zip_bytes) if sorted_zip_bytes else 0} bytes")  # Debug
        
        if not sorted_zip_bytes:
            return jsonify({"message": "Sorting returned empty ZIP."}), 500
        
        # Send the sorted ZIP back as a download
        from io import BytesIO
        return send_file(
            BytesIO(sorted_zip_bytes),
            mimetype='application/zip',
            as_attachment=True,
            download_name='sorted_pdfs.zip'
        )
        
    except Exception as e:
        print(f"Error in sort_pdfs_route: {e}")
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"message": "Sorting failed.", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)