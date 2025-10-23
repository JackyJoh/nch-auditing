from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId

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

if __name__ == '__main__':
    app.run(debug=True)