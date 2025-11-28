from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId
from sorting import sort_pdfs
from contacts import to_vcf
from functools import wraps
import jwt
from pytz import timezone as pytz_timezone
import boto3
import base64
import json
import math

load_dotenv()

app = Flask(__name__)

# Configure CORS to allow credentials
CORS(app, 
     supports_credentials=True,
     resources={r"/*": {"origins": "*"}},  # ⚠️ ALLOWS ALL ORIGINS - SECURITY RISK
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

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

# Get debug mode from environment
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

# Simple auth decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        token = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1].strip()
        elif auth_header:
            token = auth_header.strip()
        
        # Fallback to cookie
        if not token:
            token = request.cookies.get('authToken')
        
        if not token:
            if DEBUG_MODE:
                print("[AUTH] No token provided")
            return jsonify({"message": "Unauthorized"}), 401

        # Validate JWT token with leeway for clock skew
        try:
            secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
            payload = jwt.decode(token, secret_key, algorithms=["HS256"], leeway=60)
        except jwt.ExpiredSignatureError:
            if DEBUG_MODE:
                print("[AUTH] Token expired")
            return jsonify({"message": "Token has expired"}), 401
        except jwt.InvalidTokenError as e:
            if DEBUG_MODE:
                print(f"[AUTH] Invalid token: {e}")
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated_function

# Function to get current time in the server's local timezone
def get_localized_now():
    # Use server's local timezone, or set to US/Eastern if you want EST/EDT
    # Change 'US/Eastern' to your preferred timezone if needed
    local_tz = os.getenv("LOCAL_TIMEZONE", "US/Eastern")
    return datetime.now(pytz_timezone(local_tz))

# Route for adding insurance configurations
@app.route('/api/insurance-configs', methods=['POST'])
@require_auth
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
        data_payload['created_at'] = datetime.now(timezone.utc)  # FIXED
        
        result = collection.insert_one(data_payload)
            
        return jsonify({
            "message": "Configuration added successfully.",
            "id": str(result.inserted_id)  # Changed to 'id' for consistency
        }), 201

    except Exception as e:
        return jsonify({"message": "MongoDB insertion failed.", "error": str(e)}), 500

# Route for retrieving insurance configurations
@app.route('/api/insurance-configs', methods=['GET'])
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
def upload_gaps_file():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        gaps_file = request.files.get('gapsFile')
        if not gaps_file:
            return jsonify({"message": "Gaps file is required."}), 400
        
        from io import BytesIO
        import pandas as pd
        
        # Read and validate the file - support both Excel and CSV
        file_content = gaps_file.read()
        
        if gaps_file.filename.endswith('.csv'):
            gaps_df = pd.read_csv(BytesIO(file_content))
        else:
            gaps_df = pd.read_excel(BytesIO(file_content))
        
        # Convert to JSON for storage
        gaps_data = gaps_df.to_dict('records')
        
        # Store in MongoDB (replace existing if any)
        collection = db.system_files
        collection.delete_many({"file_type": "gaps"})
        collection.insert_one({
            "file_type": "gaps",
            "data": gaps_data,
            "columns": list(gaps_df.columns),
            "uploaded_at": get_localized_now().isoformat()
        })
        
        # Add uploaded gaps file process to history in mongo
        if db is not None:
            try:
                collection_history = db.history
                collection_history.insert_one({
                    "type": "upload_gaps",
                    "description": f"Uploaded Gap Name Keys file ({len(gaps_data)} rows)",
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "success"
                })
            except Exception as e:
                if DEBUG_MODE:
                    print(f"Error saving history: {e}")
        
        return jsonify({"message": "Gaps file uploaded successfully."}), 201
        
    except Exception as e:
        # if DEBUG_MODE:
        #     print(f"Error uploading gaps file: {str(e)}")
        #     import traceback
        #     traceback.print_exc()
        
        # Add failed status to history in mongo
        if db is not None:
            try:
                collection_history = db.history
                collection_history.insert_one({
                    "type": "upload_gaps",
                    "description": "Failed to upload Gap Name Keys file",
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "error"
                })
            except Exception as hist_error:
                if DEBUG_MODE:
                    print(f"Error saving history: {hist_error}")
        
        return jsonify({"message": "Failed to upload gaps file."}), 500

# Route for retrieving gaps file info
@app.route('/api/gaps-file', methods=['GET'])
@require_auth
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
@require_auth
def append_care_gaps():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503

    try:
        # Get the uploaded files
        master_file = request.files.get('masterFile')
        if not master_file:
            return jsonify({"message": "Master file is required."}), 400
        
        # Get gaps file from database
        gaps_doc = db.system_files.find_one({"file_type": "gaps"})
        if not gaps_doc:
            return jsonify({"message": "Gaps file not found. Please upload it in Settings."}), 400
        
        # Get the enableToBeRemoved boolean
        enable_to_be_removed = request.form.get('enableToBeRemoved', 'false').lower() == 'true'
        
        # Get care gap files and their config IDs
        care_gap_files_with_configs = []
        
        file_index = 0
        while True:
            file_key = f'careSheet_{file_index}'
            config_key = f'configId_{file_index}'
            
            care_file = request.files.get(file_key)
            config_id = request.form.get(config_key)
            
            if not care_file or not config_id:
                break
                
            care_gap_files_with_configs.append((care_file, config_id))
            file_index += 1
        
        if len(care_gap_files_with_configs) == 0:
            return jsonify({"message": "At least one care gap sheet is required."}), 400
        

        # Prepare care_gap_files for Lambda
        care_gap_files_payload = []
        for f, config_id in care_gap_files_with_configs:
            config = db.insurance.find_one({"_id": ObjectId(config_id)})
            if not config:
                return jsonify({"message": f"Config not found for ID {config_id}"}), 400
            care_gap_files_payload.append({
                "file": base64.b64encode(f.read()).decode(),
                "filename": f.filename,
                "config_fields": config['fields']
            })

        # Prepare NAME mapping data for Lambda
        gaps_data = clean_nans(gaps_doc.get("data", []))
        gaps_columns = gaps_doc.get("columns", [])

        # Prepare Lambda payload
        lambda_payload = {
            "master_file": base64.b64encode(master_file.read()).decode(),
            "master_filename": master_file.filename,
            "care_gap_files": care_gap_files_payload,
            "gaps_data": gaps_data,
            "gaps_columns": gaps_columns,
            "enable_to_be_removed": enable_to_be_removed
        }

        # Call Lambda
        lambda_client = boto3.client(
            'lambda',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION")
        )
        response = lambda_client.invoke(
            FunctionName='mergeCareGaps',
            Payload=json.dumps(lambda_payload, allow_nan=False)
        )
        result = json.loads(response['Payload'].read())

        if result.get('status') != 'success' or 'merged_file' not in result:
            return jsonify({"message": result.get('error', 'Merging failed.')}), 500

        merged_file_bytes = base64.b64decode(result['merged_file'])

        # Add merging process to history in mongo
        
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "append_gaps",
                    "description": f'Appended {len(care_gap_files_with_configs)} care gap sheet{"s" if len(care_gap_files_with_configs) != 1 else ""}',
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": result.get('status')
                })
            except Exception as e:
                if DEBUG_MODE:
                    print(f"Error saving history: {e}")                

        # Send the merged file back as a download
        from io import BytesIO
        return send_file(
            BytesIO(merged_file_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='merged_care_gaps.xlsx'
        )
        
    except Exception as e:
        # Add failed status to history in mongo
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "append_gaps",
                    "description": "Failed to append care gap sheets",
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "error"
                })
            except Exception as hist_error:
                if DEBUG_MODE:
                    print(f"Error saving history: {hist_error}")
        
        return jsonify({"message": "Merging failed."}), 500
    
# Route for converting contacts to VCF
@app.route('/api/contacts', methods=['POST'])
@require_auth
def convert_contacts_to_vcf():
    try:
        contact_file = request.files.get('contactSheet')
        if not contact_file:
            return jsonify({"message": "Contact sheet file is required."}), 400
        
        name_column = request.form.get('nameColumn')
        number_column = request.form.get('numberColumn')
        
        if not name_column or not number_column:
            return jsonify({"message": "Name column and number column are required."}), 400
        
        vcf_response = to_vcf(contact_file, name_column, number_column)
        # Add contact process to history in mongo
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "contacts_vcf",
                    "description": f'Converted contacts to VCF from {contact_file.filename}',
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "success"
                })
            except Exception as e:
                if DEBUG_MODE:
                    print(f"Error saving history: {e}")
        return vcf_response

    except Exception as e:
        # Add failed status to history in mongo
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "contacts_vcf",
                    "description": "Failed to convert contacts to VCF",
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "error"
                })
            except Exception as hist_error:
                if DEBUG_MODE:
                    print(f"Error saving history: {hist_error}")
        return jsonify({"message": "VCF conversion failed."}), 500
    
# Route for sorting PDFs
@app.route('/api/sort-pdfs', methods=['POST'])
@require_auth
def sort_pdfs_route():
    try:
        # Get the uploaded master file
        master_file = request.files.get('masterFile')
        if not master_file:
            return jsonify({"message": "Master file is required."}), 400
        
        # Get the uploaded PDF files
        pdf_files = request.files.getlist('pdfFiles')
        if not pdf_files or len(pdf_files) == 0:
            return jsonify({"message": "At least one PDF file is required."}), 400
        
        # Limit to prevent memory issues
        if len(pdf_files) > 200:
            return jsonify({"message": "Maximum 200 PDF files allowed at once. Please split into smaller batches."}), 400
        
        # Call the sorting function
        sorted_zip_bytes = sort_pdfs(master_file, pdf_files)
        
        if not sorted_zip_bytes:
            # Add failure to sorting history in mongo
            if db is not None:
                try:
                    collection = db.history
                    collection.insert_one({
                        "type": "sort",
                        "description": "Sorting returned empty ZIP",
                        "timestamp": get_localized_now().isoformat(),
                        "user": "Admin",
                        "status": "error"
                    })
                except Exception as e:
                    if DEBUG_MODE:
                        print(f"Error saving history: {e}")
            return jsonify({"message": "Sorting returned empty ZIP."}), 500
        
        # Add sorted pdfs process to history in mongo
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "sort",
                    "description": f'Sorted {len(pdf_files)} PDF{"s" if len(pdf_files) != 1 else ""}',
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "success"
                })
            except Exception as e:
                if DEBUG_MODE:
                    print(f"Error saving history: {e}")

        # Send the sorted ZIP back as a download
        from io import BytesIO
        return send_file(
            BytesIO(sorted_zip_bytes),
            mimetype='application/zip',
            as_attachment=True,
            download_name='sorted_pdfs.zip'
        )
        
    except Exception as e:
        # Add failed status to history in mongo
        if db is not None:
            try:
                collection = db.history
                collection.insert_one({
                    "type": "sort",
                    "description": "Failed to sort PDFs",
                    "timestamp": get_localized_now().isoformat(),
                    "user": "Admin",
                    "status": "error"
                })
            except Exception as hist_error:
                if DEBUG_MODE:
                    print(f"Error saving history: {hist_error}")
        
        return jsonify({"message": "Sorting failed."}), 500

# Route for retrieving all history
@app.route('/api/history', methods=['GET'])
@require_auth
def get_history():
    if db is None:
        return jsonify({"message": "Database connection is down."}), 503
    try:
        db_collection = db.history
        history_records = list(db_collection.find().sort("timestamp", -1))
        for record in history_records:
            record['_id'] = str(record['_id'])  # Convert ObjectId to string
            if 'timestamp' in record and isinstance(record['timestamp'], datetime):
                record['timestamp'] = record['timestamp'].isoformat()
        return jsonify(history_records), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve history.", "error": str(e)}), 500

# Route for login (NO AUTH REQUIRED)
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        password = data.get('password')

        if not password:
            return jsonify({"message": "Password is required."}), 400

        correct_password = os.getenv("APP_PASSWORD")
        if password == correct_password:
            # Generate JWT token
            secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
            now = datetime.now(timezone.utc)
            payload = {
                "authenticated": True,
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(hours=1)).timestamp())  # CHANGED: 1 hour instead of 7 days
            }
            token = jwt.encode(payload, secret_key, algorithm="HS256")
            
            resp = jsonify({
                "message": "Login successful",
                "token": token
            })
            secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
            resp.set_cookie(
                "authToken",
                token,
                httponly=True,
                secure=secure,
                samesite='None' if secure else 'Lax',
                max_age=60 * 60,  # CHANGED: 1 hour instead of 7 days
                path='/'
            )
            return resp, 200
        else:
            return jsonify({"message": "Incorrect password"}), 401

    except Exception as e:
        return jsonify({"message": "Login failed."}), 500



# Health check endpoint (NO AUTH REQUIRED)
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Backend is running"}), 200

def clean_nans(obj):
    if isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj

if __name__ == '__main__':
    app.run(debug=True)