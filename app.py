from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os, json, openai
from util import *

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = openai.OpenAI(api_key=open("api key.txt").read())

def get_text_from_request(req, file_path=None):
    if req.form.get("text"):
        return req.form["text"]

    if file_path:
        ext = file_path.split(".")[-1].lower()
        if ext == "pdf":
            return extract_text_from_pdf(file_path)
        if ext == "docx":
            return extract_text_from_docx(file_path)
        if ext in ["png", "jpg", "jpeg"]:
            return extract_from_image(file_path)
        if ext in ["mp3", "wav"]:
            return extract_from_audio(file_path)
        if ext == "txt":
            return open(file_path).read()

    return ""

@app.route("/notegen", methods=["POST"])
def notegen():
    text = ""
    if "file" in request.files:
        f = request.files["file"]
        path = os.path.join(UPLOAD_FOLDER, secure_filename(f.filename))
        f.save(path)
        text = get_text_from_request(request, path)
        os.remove(path)
    else:
        text = request.form.get("text", "")

    prompt = f"Generate concise bullet-point notes in HTML. Remove references.\n{text}"

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return jsonify({"output": res.choices[0].message.content})

@app.route("/quizgen", methods=["POST"])
def quizgen():
    text = ""
    if "file" in request.files:
        f = request.files["file"]
        path = os.path.join(UPLOAD_FOLDER, secure_filename(f.filename))
        f.save(path)
        text = get_text_from_request(request, path)
        os.remove(path)
    else:
        text = request.form.get("text", "")

    prompt = f"""
Generate a multiple choice quiz.
Rules:
- Exactly 10 questions
- 4 choices
- One correct answer
- Output ONLY valid JSON
{text}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return jsonify(json.loads(res.choices[0].message.content))

if __name__ == "__main__":
    app.run(debug=True)
