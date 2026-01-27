import pdfplumber
from docx import Document
import base64
import speech_recognition as sr
import os
from pydub import AudioSegment
from PIL import Image
import io
import fitz

def extract_img_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)

    for page in range(len(doc)):
        for img_num, img in enumerate(doc[page].get_images(full=True)):
            xref = img[0]
            base_img = doc.extract_image(xref)
            img_bytes = base_img["image"]
            img_ext = base_img["ext"]

            with open(f"uploads/images/img_{page}_{img_num}.{img_ext}", "wb") as f:
                f.write(img_bytes)

def extract_text_from_pdf(pdf_path):
    """Extract text content from a PDF file using pdfplumber."""
    with pdfplumber.open(pdf_path) as pdf:
        text = " ".join(page.extract_text() or "" for page in pdf.pages)
    return text.strip()

def extract_text_from_docx(docx_path):
    """Extract text content from a DOCX file using python-docx."""
    doc = Document(docx_path)
    text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    return text.strip()

def extract_from_image(client, img_path):
    """Extract text from an image using OpenAI's Vision API (OCR)."""
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
        img_data_uri = f"data:image/jpeg;base64,{img_b64}"  # works for jpeg/png

    completion = client.chat.completions.create(
        model="gpt-4o-mini",  # vision-capable
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all the words from this image, keep line breaks if possible."},
                    {"type": "image_url", "image_url": {"url": img_data_uri}}
                ]
            }
        ],
        max_tokens=1024,
    )

    return completion.choices[0].message.content.strip()


def extract_from_audio(audio_path):
    """Extract text from an audio file using speech recognition."""
    recognizer = sr.Recognizer()
    audio = AudioSegment.from_file(audio_path)
    audio = audio.set_channels(1).set_frame_rate(16000)  # Normalize audio
    temp_wav = "temp.wav"
    audio.export(temp_wav, format="wav")

    with sr.AudioFile(temp_wav) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError:
            text = "Speech Recognition API unavailable"

    os.remove(temp_wav)
    return text.strip()