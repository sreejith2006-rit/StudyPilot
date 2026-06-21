from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from app.models.document import DocumentResponse
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from datetime import datetime
import shutil
import os
from bson import ObjectId
from app.rag.document_processor import process_file_to_qdrant, load_document_text
from app.rag.ai_generators import generate_document_summary_ai

router = APIRouter(prefix="/documents", tags=["documents"])

# Ensure upload directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Check extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {ext}. Allowed: PDF, DOCX, PPTX."
        )
    
    db = get_database()
    user_id = current_user["_id"]
    
    # Save file to disk
    # To prevent filename collisions, prefix with timestamp
    timestamp = int(datetime.utcnow().timestamp())
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {str(e)}"
        )
        
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Insert metadata to MongoDB
    doc_dict = {
        "user_id": user_id,
        "filename": file.filename,
        "file_type": ext.lower()[1:], # strip '.'
        "file_size": file_size,
        "status": "active", # directly set to active for skeletal operations
        "upload_date": datetime.utcnow(),
        "storage_path": file_path,
        "qdrant_collection": f"doc_{user_id}_{timestamp}"
    }
    
    result = await db["documents"].insert_one(doc_dict)
    doc_dict["_id"] = str(result.inserted_id)
    
    # Enqueue background task
    background_tasks.add_task(
        process_file_to_qdrant,
        file_path=file_path,
        collection_name=doc_dict["qdrant_collection"],
        metadata={"document_id": doc_dict["_id"], "filename": doc_dict["filename"]}
    )
    
    return doc_dict

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    cursor = db["documents"].find({"user_id": user_id})
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        documents.append(doc)
    return documents

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Check if doc exists and belongs to user
    try:
        doc = await db["documents"].find_one({"_id": ObjectId(document_id), "user_id": user_id})
    except Exception:
        doc = await db["documents"].find_one({"_id": document_id, "user_id": user_id})
        
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    # Delete from disk
    storage_path = doc.get("storage_path")
    if storage_path and os.path.exists(storage_path):
        try:
            os.remove(storage_path)
        except Exception:
            pass # continue deleting metadata if file can't be deleted
            
    # Delete metadata from MongoDB
    try:
        await db["documents"].delete_one({"_id": ObjectId(document_id)})
    except Exception:
        await db["documents"].delete_one({"_id": document_id})
        
    # Return 204 No Content
    return None

@router.post("/{document_id}/summarize", response_model=dict)
async def summarize_document(
    document_id: str,
    force: bool = False,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Check if doc exists and belongs to user
    try:
        doc = await db["documents"].find_one({"_id": ObjectId(document_id), "user_id": user_id})
    except Exception:
        doc = await db["documents"].find_one({"_id": document_id, "user_id": user_id})
        
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    # Return cached summary if available
    if not force and doc.get("summary"):
        return {"summary": doc["summary"], "cached": True}
        
    storage_path = doc.get("storage_path")
    if not storage_path or not os.path.exists(storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document source file not found on disk"
        )
        
    # Load raw text and generate summary
    text = load_document_text(storage_path)
    summary = await generate_document_summary_ai(doc["filename"], text)
    
    # Update document in MongoDB with summary
    try:
        await db["documents"].update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"summary": summary}}
        )
    except Exception:
        await db["documents"].update_one(
            {"_id": document_id},
            {"$set": {"summary": summary}}
        )
        
    return {"summary": summary, "cached": False}
