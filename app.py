# imports #
import openai
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from util import *
import requests # to summarize/quiz a website 👀

# flask setup #
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},  # Allow all origins for all routes
    methods=["GET", "POST", "OPTIONS", "HEAD"], # Ensure OPTIONS is allowed for preflight
    allow_headers=["Content-Type", "Authorization"] # Allow common headers
    )
app.config["UPLOAD_FOLDER"] = "uploads"  # Directory to store uploaded files
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

def get_key():
    f = open("api key.txt")
    key = f.read()
    f.close()
    return key

print(get_key())


# openai setup #
client = openai.OpenAI(api_key=f"{get_key()}")

# actual app api
    
def create_notes(file_path):
    root, file_ext = os.path.splitext(file_path)
    file_ext = file_ext[1:]
    text = ""

    if file_ext == "pdf":
        text = extract_text_from_pdf(file_path)
    elif file_ext == "docx":
        text = extract_text_from_docx(file_path)
    elif file_ext in ["png", "jpeg", "jpg"]:
        text = extract_from_image(file_path)
    elif file_ext in ["mp3", "wav"]:
        text = extract_from_audio(file_path)
    elif file_ext == "txt":
        with open("file_path", "r") as f:
            text = f.read()
            f.close()
    else:
        return file_ext, "Unsupported file type"

    prompt = f"Generate notes based on the following text using the bullet point note-taking method. Notes should be short but comprehensive. Format in HTML in raw text. Remove the references portion.\n{text}"

    completion = client.chat.completions.create(
        max_tokens=4096,
        n=1,
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return completion.choices[0].message.content

def create_quiz(file_path):
    root, file_ext = os.path.splitext(file_path)
    file_ext = file_ext[1:]

    if file_ext == "pdf":
        text = extract_text_from_pdf(file_path)
    elif file_ext == "docx":
        text = extract_text_from_docx(file_path)
    elif file_ext in ["png", "jpeg", "jpg"]:
        text = extract_from_image(file_path)
    elif file_ext in ["mp3", "wav"]:
        text = extract_from_audio(file_path)
    elif file_ext == "txt":
        with open(file_path, "r") as f:
            text = f.read()
            f.close()
    else:
        return file_ext, "Unsupported file type"

    prompt = f"""
Generate a multiple choice quiz.

Rules:
- Exactly 10 questions
- 4 choices each
- One correct answer
- Output ONLY valid JSON
- No markdown
- No explanations

JSON format:
{{
  "questions": [
    {{
      "question": "text",
      "choices": ["A", "B", "C", "D"],
      "answer": 0
    }}
  ]
}}

Text:
{text}
"""
    
# add hint/correct part

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = completion.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("❌ Invalid JSON from model:\n", raw)
        return {"error": "Quiz generation failed"}

# main flask stuff
@app.route("/notegen", methods=["POST"])
def gennote():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_type = request.form.get("doctype", "PDF").upper()  # Default to PDF
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    print(file_path)
    file.save(file_path)  # Save file to the server

    notes = create_notes(file_path)
    os.remove(file_path)  # Clean up uploaded file after processing

    return jsonify({"output": notes})

@app.route("/quizgen", methods=["POST"])
def genquiz():
    file = request.files["file"]
    file_type = request.form.get("doctype").upper()

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    quiz = create_quiz(file_path)
    os.remove(file_path)

    return jsonify(quiz)

@app.route("/answerquiz", methods=["POST"])
def answer():
    question = request.data.decode('utf-8')
    print(question)

    if not question:
        return jsonify({"error": "No question provided in request body."}), 400

    prompt = f"Give a clear, short, and concise answer to the given question:\n{question}"

    print(prompt)

    completion = client.chat.completions.create(
        max_tokens=4096,
        n=1,
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = completion.choices[0].message.content

    return jsonify({"output": answer})

@app.route("/resolveanswer", methods=["POST"])
def resolveanswer():
    qna = request.data.decode('utf-8')

    if not qna:
        return jsonify({"error": "No question provided in request body."}), 400

    prompt = qna

    print(prompt)

    completion = client.chat.completions.create(
        max_tokens=4096,
        n=1,
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    data = completion.choices[0].message.content

    return jsonify({"output": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)