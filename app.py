"""
Flask Application for FAQ Chatbot Web Interface & REST API
"""

import os
from flask import Flask, render_template, request, jsonify
from chatbot import FAQChatbot

app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize chatbot instance
bot = FAQChatbot()


@app.route('/')
def index():
    """Render main chat interface."""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Handle incoming chat message from user.
    Payload: {"message": "..."}
    """
    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({
            "success": False,
            "response": "Please provide a valid question.",
            "confidence": 0.0,
            "suggestions": bot.get_popular_questions(3)
        }), 400

    result = bot.get_response(user_message)
    return jsonify(result)


@app.route('/api/faqs', methods=['GET'])
def get_faqs():
    """Return all FAQ data and categories for quick browsing in the UI."""
    return jsonify({
        "categories": bot.get_all_categories(),
        "faqs": bot.faqs,
        "popular_questions": bot.get_popular_questions(5)
    })


@app.route('/api/import-faqs', methods=['POST'])
def import_faqs():
    """
    Import new FAQs into the chatbot knowledge base, trigger NLP preprocessing,
    and re-build the TF-IDF vector index in real-time.
    Supports JSON body, or file upload (JSON/CSV).
    """
    try:
        mode = request.form.get('mode', 'append')
        imported_list = []

        # Check for uploaded file
        if 'file' in request.files:
            file = request.files['file']
            filename = file.filename.lower()
            
            if filename.endswith('.json'):
                import json
                file_content = file.read().decode('utf-8-sig')
                imported_list = json.loads(file_content)
            elif filename.endswith('.csv'):
                import csv
                import io
                file_content = file.read().decode('utf-8-sig')
                reader = csv.DictReader(io.StringIO(file_content))
                for row in reader:
                    # CSV row mapping (case-insensitive keys)
                    q = row.get('question') or row.get('Question') or ''
                    a = row.get('answer') or row.get('Answer') or ''
                    c = row.get('category') or row.get('Category') or 'General'
                    p = row.get('patterns') or row.get('Patterns') or ''
                    if q and a:
                        imported_list.append({
                            "question": q.strip(),
                            "answer": a.strip(),
                            "category": c.strip(),
                            "patterns": [item.strip() for item in p.split(';') if item.strip()] if p else []
                        })
            else:
                return jsonify({"status": "error", "message": "Unsupported file format. Please upload .json or .csv"}), 400
        else:
            # Check for JSON payload
            data = request.get_json(silent=True) or {}
            mode = data.get('mode', mode)
            imported_list = data.get('faqs', [])

        if not imported_list:
            return jsonify({"status": "error", "message": "No valid FAQ items found in request."}), 400

        result = bot.import_faqs(imported_list, mode=mode)
        return jsonify(result)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/feedback', methods=['POST'])
def feedback():
    """Store feedback for a given bot answer."""
    data = request.get_json(silent=True) or {}
    faq_id = data.get('faq_id')
    is_helpful = data.get('helpful', True)
    
    # In a production app, persist to database/logs
    return jsonify({
        "status": "success",
        "message": "Thank you for your feedback!"
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f">>> Starting FAQ Chatbot Web Server on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=False)
