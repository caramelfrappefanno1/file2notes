# =========================
# Imports
# =========================
import os
import openai
import json
import requests
from flask import Flask, request, jsonify
from bs4 import BeautifulSoup
from werkzeug.utils import secure_filename
from util import *
from flask import render_template
import datetime

# =========================
# Flask Setup
# =========================
app = Flask(__name__, static_folder="static")
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# =========================
# OpenAI Setup
# =========================
def get_key():
    with open("api key.txt") as f:
        return f.read().strip()

client = openai.OpenAI(api_key=get_key())

# =========================
# Serve Frontend
# =========================
@app.route("/")
def home():
    return render_template("index.html")

# =========================
# Extract Website Text
# =========================
def extract_text_from_url(url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }

        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()

        # Detect common bot protection / JS challenge pages
        blocked_signatures = [
            "javascript is disabled",
            "enable javascript to proceed",
            "client challenge",
            "cloudflare",
            "access denied",
            "bot verification"
        ]

        lower_html = r.text.lower()

        if any(sig in lower_html for sig in blocked_signatures):
            return "__BLOCKED__"

        soup = BeautifulSoup(r.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)

        if len(text) < 200:
            return None

        return text

    except Exception as e:
        print("URL fetch error:", e)
        return None
# =========================
# Save Previous Quizzes
# =========================

def save_quiz_to_history(quiz_data):
    history_file = "quiz_history.json"

    # Create file if it doesn't exist
    if not os.path.exists(history_file):
        with open(history_file, "w") as f:
            json.dump([], f)

    # Load existing history
    with open(history_file, "r") as f:
        history = json.load(f)

    # Append new quiz with timestamp
    history.append({
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "questions": quiz_data.get("questions", [])
    })

    # Save back
    with open(history_file, "w") as f:
        json.dump(history, f, indent=4)

# =========================
# Quiz Generator
# =========================
def create_quiz_from_text(text):

    max_chars = 50000
    if len(text) > max_chars:
        text = text[:max_chars]

    prompt = f"""
Generate a multiple choice quiz focused ONLY on the concepts in this text.

Rules:
- Exactly 10 questions
- 4 choices each
- One correct answer
- Output ONLY valid JSON
- No markdown
- Short single sentence explanation

JSON format:
{{
  "questions": [
    {{
      "question": "text",
      "choices": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "text"
    }}
  ]
}}

Text:
{text}
"""

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = completion.choices[0].message.content.strip()

        return json.loads(raw)

    except json.JSONDecodeError:
        return {"error": "AI returned invalid response format."}

    except openai.AuthenticationError:
        return {"error": "OpenAI API key is invalid or missing."}

    except openai.RateLimitError:
        return {"error": "OpenAI quota exceeded. Please try again later."}

    except openai.APIConnectionError:
        return {"error": "Unable to connect to OpenAI servers. Check your internet connection."}

    except openai.APIError:
        return {"error": "OpenAI server error. Please try again."}

    except Exception as e:
        print("Unexpected OpenAI error:", e)
        return {"error": "Unexpected AI error occurred."}

# =========================
# Quiz Route
# =========================
@app.route("/quizgen", methods=["POST"])
def genquiz():
    try:
        # FILE MODE
        if "file" in request.files:
            file = request.files["file"]

            if file.filename == "":
                return jsonify({"error": "No file selected"}), 400

            filename = file.filename
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)

            ext = filename.lower().split(".")[-1]

            if ext == "pdf":
                text = extract_text_from_pdf(filepath)
            elif ext == "docx":
                text = extract_text_from_docx(filepath)
            elif ext == "txt":
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            else:
                return jsonify({"error": "Unsupported file type"}), 400

            quiz = create_quiz_from_text(text)

            if "error" not in quiz:
                save_quiz_to_history(quiz)

            return jsonify(quiz)

        # JSON MODE
        if request.is_json:
            data = request.get_json()
            text = data.get("text", "").strip()
            link = data.get("link", "").strip()

            if link:
                text = extract_text_from_url(link)

                if text == "__BLOCKED__":
                    return jsonify({
                        "error": "This site is protected or does not permit scraping."
                    }), 400

                if not text:
                    return jsonify({"error": "Invalid or blocked link"}), 400

            if not text:
                return jsonify({"error": "No text provided"}), 400

            quiz = create_quiz_from_text(text)

            if "error" not in quiz:
                save_quiz_to_history(quiz)

            return jsonify(quiz)

        return jsonify({"error": "Invalid request"}), 400

    except Exception as e:
        print("Server crash:", e)
        return jsonify({
            "error": "Server error occurred. Please try again."
        }), 500

@app.route("/history", methods=["GET"])
def get_history():
    history_file = "quiz_history.json"

    if not os.path.exists(history_file):
        return jsonify([])

    with open(history_file, "r") as f:
        history = json.load(f)

    return jsonify(history)

# =========================
# Run
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

