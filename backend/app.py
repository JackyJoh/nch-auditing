# backend/app.py (Modified)
from flask import Flask, jsonify
from flask_cors import CORS
# Import the datetime module
from datetime import datetime

app = Flask(__name__)
CORS(app) 

@app.route('/api/time', methods=['GET'])
def get_current_time():
    now = datetime.now()
    current_time = now.strftime("%I:%M:%S %p")  # Formats time (e.g., 02:41:53 PM)
    
    return jsonify({
        'time': f'It is currently {current_time}' 
    }) 

if __name__ == '__main__':
    # You can also disable debug mode here if you're done with development testing
    app.run(debug=True)