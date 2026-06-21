from fastapi import APIRouter, Depends, HTTPException, status
from app.models.quiz import QuizCreate, QuizResponse, QuizAttemptSubmit, QuizAttemptResponse
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from app.rag.ai_generators import generate_quiz_ai
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.post("/", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    quiz_data: QuizCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Generate quiz using Gemini
    questions = await generate_quiz_ai(
        topic=quiz_data.topic or "General Study",
        document_id=quiz_data.document_id,
        quiz_type=quiz_data.type,
        num_questions=quiz_data.num_questions
    )
    
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI quiz."
        )
        
    quiz_dict = {
        "user_id": user_id,
        "document_id": quiz_data.document_id,
        "quiz_type": quiz_data.type,
        "questions": questions,
        "created_at": datetime.utcnow()
    }
    
    result = await db["quizzes"].insert_one(quiz_dict)
    quiz_dict["_id"] = str(result.inserted_id)
    
    return quiz_dict

@router.post("/{quiz_id}/attempt", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    quiz_id: str,
    submission: QuizAttemptSubmit,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Retrieve the quiz
    try:
        quiz = await db["quizzes"].find_one({"_id": ObjectId(quiz_id)})
    except Exception:
        quiz = await db["quizzes"].find_one({"_id": quiz_id})
        
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    # Grade the quiz
    questions = quiz["questions"]
    answers_dict = {ans["question_id"]: ans["answer"] for ans in submission.answers}
    
    answers_evaluation = []
    correct_count = 0
    total_questions = len(questions)
    
    weak_topics_detected = []
    
    for q in questions:
        q_id = q["id"]
        submitted_ans = answers_dict.get(q_id, "")
        correct_ans = q["correct_answer"]
        
        # Simple string matching for now (AI grading logic in future phases)
        is_correct = submitted_ans.strip().lower() == correct_ans.strip().lower()
        if is_correct:
            correct_count += 1
        else:
            # If incorrect, suggest a weak topic based on the question (mock)
            weak_topics_detected.append(q.get("question_text", "General Topic"))
            
        answers_evaluation.append({
            "question_id": q_id,
            "question_text": q["question_text"],
            "submitted_answer": submitted_ans,
            "correct_answer": correct_ans,
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })
        
    accuracy = (correct_count / total_questions * 100) if total_questions > 0 else 0.0
    
    attempt_dict = {
        "quiz_id": quiz_id,
        "user_id": user_id,
        "score": correct_count,
        "total_questions": total_questions,
        "accuracy": accuracy,
        "answers_evaluation": answers_evaluation,
        "timestamp": datetime.utcnow()
    }
    
    result = await db["quizAttempts"].insert_one(attempt_dict)
    attempt_id = str(result.inserted_id)
    attempt_dict["_id"] = attempt_id
    
    # Save weak topics to DB
    if weak_topics_detected:
        for topic in weak_topics_detected[:2]: # add up to 2 weak topics
            # Find and update or insert weak topic
            topic_name = topic.replace("What is the primary function of the studied topic: ", "").replace("True or False: ", "")
            await db["weakTopics"].update_one(
                {"user_id": user_id, "topic_name": topic_name},
                {
                    "$set": {"confidence_level": "low", "last_evaluated_at": datetime.utcnow()},
                    "$inc": {"occurrences": 1},
                    "$setOnInsert": {"quiz_accuracy": accuracy}
                },
                upsert=True
            )
            
    # Update global analytics
    analytics = await db["analytics"].find_one({"user_id": user_id})
    if analytics:
        new_attempts_count = analytics.get("quizzes_attempted", 0) + 1
        # Running average for accuracy
        prev_accuracy = analytics.get("overall_accuracy", 0.0)
        new_accuracy = ((prev_accuracy * (new_attempts_count - 1)) + accuracy) / new_attempts_count
        
        # Calculate weak topics count
        weak_count = await db["weakTopics"].count_documents({"user_id": user_id})
        
        # Ready score calculation logic (aligned with analytics.py)
        acc = new_accuracy
        comp = analytics.get("completion_percentage", 0.0)
        quizzes = min(10, new_attempts_count) * 2
        weak = weak_count * 5
        base_score = (acc * 0.5) + (comp * 0.3) + quizzes - weak
        exam_readiness = max(0.0, min(100.0, base_score))
        
        await db["analytics"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "quizzes_attempted": new_attempts_count,
                    "overall_accuracy": new_accuracy,
                    "weak_topics_count": weak_count,
                    "exam_readiness_score": exam_readiness,
                    "last_updated": datetime.utcnow()
                }
            }
        )

        
    return attempt_dict

@router.get("/attempts", response_model=list[QuizAttemptResponse])
async def list_quiz_attempts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    cursor = db["quizAttempts"].find({"user_id": user_id}).sort("timestamp", -1)
    attempts = []
    async for att in cursor:
        att["_id"] = str(att["_id"])
        attempts.append(att)
    return attempts
