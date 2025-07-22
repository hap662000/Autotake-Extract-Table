from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from auth import authenticate_user
from database import init_db, add_project, get_projects, get_project_results, delete_project
from pdf_processor import process_pdf
import os
import uuid
from pathlib import Path
import logging
from pdf2image import convert_from_path
import io
from PIL import Image

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize SQLite database
init_db()

# Ensure uploads directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/", response_class=HTMLResponse)
async def get_login(request: Request):
    logger.info("Serving login page")
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login", response_class=RedirectResponse)
async def post_login(username: str = Form(...), password: str = Form(...)):
    logger.info(f"Login attempt with username: {username}")
    if authenticate_user(username, password):
        logger.info("Login successful")
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    logger.error("Login failed: Invalid credentials")
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard(request: Request):
    logger.info("Serving dashboard")
    projects = get_projects()
    return templates.TemplateResponse("dashboard.html", {"request": request, "projects": projects})

@app.get("/upload", response_class=HTMLResponse)
async def get_upload(request: Request):
    logger.info("Serving upload page")
    return templates.TemplateResponse("upload.html", {"request": request})

@app.post("/upload", response_class=RedirectResponse)
async def post_upload(file: UploadFile = File(...)):
    logger.info(f"Received upload request for file: {file.filename}")
    if not file.filename.lower().endswith(".pdf"):
        logger.error("Invalid file type: Not a PDF")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    project_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{project_id}.pdf"
    logger.info(f"Saving file to: {file_path}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    logger.info("Processing PDF")
    results = process_pdf(str(file_path))
    logger.info("Adding project to database")
    add_project(project_id, file.filename, results)
    
    logger.info(f"Redirecting to results page for project: {project_id}")
    return RedirectResponse(url=f"/results/{project_id}", status_code=status.HTTP_303_SEE_OTHER)

@app.get("/results/{project_id}", response_class=HTMLResponse)
async def get_results(request: Request, project_id: str):
    logger.info(f"Serving results for project: {project_id}")
    results = get_project_results(project_id)
    if not results:
        logger.error(f"Project not found: {project_id}")
        raise HTTPException(status_code=404, detail="Project not found")
    return templates.TemplateResponse("results.html", {"request": request, "project_id": project_id, "results": results})

@app.delete("/delete/{project_id}", response_class=RedirectResponse)
async def delete_project_route(project_id: str):
    logger.info(f"Deleting project: {project_id}")
    file_path = UPLOAD_DIR / f"{project_id}.pdf"
    if delete_project(project_id):
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted file: {file_path}")
        logger.info(f"Project {project_id} deleted successfully")
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    logger.error(f"Project not found: {project_id}")
    raise HTTPException(status_code=404, detail="Project not found")

@app.get("/page-image/{project_id}/{page_number}")
async def get_page_image(project_id: str, page_number: int):
    logger.info(f"Serving page image for project: {project_id}, page: {page_number}")
    
    # Check if project exists
    results = get_project_results(project_id)
    if not results:
        logger.error(f"Project not found: {project_id}")
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get PDF file path
    file_path = UPLOAD_DIR / f"{project_id}.pdf"
    if not file_path.exists():
        logger.error(f"PDF file not found: {file_path}")
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    try:
        # Convert specific page to image
        images = convert_from_path(str(file_path), dpi=150, first_page=page_number, last_page=page_number)
        if not images:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Convert PIL image to bytes
        img_byte_arr = io.BytesIO()
        images[0].save(img_byte_arr, format='PNG', optimize=True, quality=85)
        img_byte_arr.seek(0)
        
        return Response(
            content=img_byte_arr.getvalue(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"}
        )
        
    except Exception as e:
        logger.error(f"Error generating page image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating page image")