import pdfplumber
from docx import Document
import base64
import os
import fitz
import re

def extract_code_block(text):
    match = re.search(r"```(?:\w+)?\s*([\s\S]*?)```", text)
    return match.group(1).strip() if match else None

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
    print(text.strip())
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