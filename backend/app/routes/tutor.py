from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from app.rag.qa_chain import ask_question

router = APIRouter(prefix="/tutor", tags=["tutor"])

class TutorQuery(BaseModel):
    question: str

@router.post("/ask")
async def ask_tutor(
    query: TutorQuery,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Get all active documents for this user to get their Qdrant collections
    cursor = db["documents"].find({"user_id": user_id, "status": "active"})
    collections = []
    async for doc in cursor:
        if "qdrant_collection" in doc:
            collections.append(doc["qdrant_collection"])
            
    if not collections:
        return {
            "answer": "You need to upload some documents first before I can help you study!",
            "citations": []
        }
        
    res = await ask_question(collections, query.question)
    
    return {
        "answer": res.get("answer"),
        "citations": res.get("citations", [])
    }
