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
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()

        return soup.get_text(separator=" ", strip=True)

    except Exception as e:
        print("URL fetch error:", e)
        return None

# =========================
# Quiz Generator
# =========================
def create_quiz_from_text(text):

    prompt = f"""
Generate a multiple choice quiz.

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

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = completion.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("Invalid JSON from model:\n", raw)
        return {"error": "Quiz generation failed"}

# =========================
# Quiz Route
# =========================
@app.route("/quizgen", methods=["POST"])
def genquiz():

    if request.is_json:
        data = request.get_json()
        text = data.get("text", "").strip()
        link = data.get("link", "").strip()

        if link:
            text = extract_text_from_url(link)
            if not text:
                return jsonify({"error": "Invalid or blocked link"}), 400

        if not text:
            return jsonify({"error": "No text provided"}), 400

        return jsonify(create_quiz_from_text(text))

    return jsonify({"error": "Invalid request"}), 400

# =========================
# Run
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
