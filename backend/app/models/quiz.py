from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Any, Optional

class Question(BaseModel):
    id: int
    question_text: str
    type: str  # MCQ, Short, TF
    options: Optional[List[str]] = None  # for MCQ or TF
    correct_answer: str
    explanation: Optional[str] = None

class QuizCreate(BaseModel):
    document_id: Optional[str] = None
    type: str  # MCQ, Short, TF, Mixed
    num_questions: int = Field(5, ge=1, le=20)
    topic: Optional[str] = None

class QuizResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    document_id: Optional[str] = None
    quiz_type: str
    questions: List[Question]
    created_at: datetime

    class Config:
        populate_by_name = True

class QuizAttemptSubmit(BaseModel):
    answers: List[Dict[str, Any]] # List of {"question_id": int, "answer": str}

class QuizAttemptResponse(BaseModel):
    id: str = Field(..., alias="_id")
    quiz_id: str
    user_id: str
    score: int
    total_questions: int
    accuracy: float # percentage
    answers_evaluation: List[Dict[str, Any]] # details of evaluation per question
    timestamp: datetime

    class Config:
        populate_by_name = True
