import fitz  # PyMuPDF
import re
import json
import os
import base64
from pdf2image import convert_from_path
from PIL import Image
import io
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_sheet_info(pdf_path):
    doc = fitz.open(pdf_path)
    plumbing_pages = []
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        rect = fitz.Rect(page.rect.width - 200, page.rect.height - 100, page.rect.width, page.rect.height)
        text = page.get_text("text", clip=rect)
        sheet_match = re.search(r'\bP[A-Za-z0-9]*\d+', text, re.IGNORECASE)
        if sheet_match:
            plumbing_pages.append({
                "page_number": page_num + 1,
                "sheet_number": sheet_match.group(0)
            })
    
    doc.close()
    return plumbing_pages

def convert_pages_to_images(pdf_path, page_numbers):
    if not page_numbers:
        return {}
    try:
        images = convert_from_path(pdf_path, dpi=100, first_page=min(page_numbers), last_page=max(page_numbers))
        return {page_num: images[i] for i, page_num in enumerate(range(min(page_numbers), max(page_numbers) + 1)) if page_num in page_numbers}
    except Exception as e:
        print(f"Image conversion error: {str(e)}")
        return {}

def image_to_base64(image):
    image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def classify_page_and_extract_title(image):
    base64_image = image_to_base64(image)
    
    prompt = """
    Analyze the provided image of a mechanical drawing PDF page. Perform the following tasks:
    1. Classify the page as either "Plumbing Drawing" or "Plumbing Schedule":
       - Plumbing Drawing: Contains diagrams, annotations, symbols, or schematics (e.g., piping layouts, fixtures).
       - Plumbing Schedule: Contains tables with rows/columns (e.g., equipment, quantities).
    2. Extract the sheet title from the bottom right corner, near the sheet number (e.g., 'PD101'). The title describes the content (e.g., 'Plumbing Layout'). Use 'Unknown' if not found.

    Return a JSON object:
    {
        "classification": "Plumbing Drawing" or "Plumbing Schedule",
        "sheet_title": "<sheet title or 'Unknown'>"
    }
    Ensure valid JSON without backticks or code fences.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                    ]
                }
            ],
            max_tokens=100,
            timeout=10
        )
        raw_response = response.choices[0].message.content.strip()
        cleaned_response = raw_response.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"GPT API error: {str(e)}")
        return {"classification": "Unknown", "sheet_title": "Unknown"}

def process_pdf(pdf_path):
    plumbing_pages = extract_sheet_info(pdf_path)
    if not plumbing_pages:
        return {"Plumbing Drawings": [], "Plumbing Schedules": []}
    
    page_numbers = [page["page_number"] for page in plumbing_pages]
    page_images = convert_pages_to_images(pdf_path, page_numbers)
    
    drawings = []
    schedules = []
    
    for page in plumbing_pages:
        page_num = page["page_number"]
        image = page_images.get(page_num)
        if image:
            result = classify_page_and_extract_title(image)
            classification = result.get("classification", "Unknown")
            sheet_title = result.get("sheet_title", "Unknown")
            page_info = {
                "page_number": page_num,
                "sheet_number": page["sheet_number"],
                "sheet_title": sheet_title
            }
            if classification == "Plumbing Drawing":
                drawings.append(page_info)
            elif classification == "Plumbing Schedule":
                schedules.append(page_info)
    
    return {
        "Plumbing Drawings": drawings,
        "Plumbing Schedules": schedules
    }