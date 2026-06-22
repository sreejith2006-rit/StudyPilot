from fastapi import APIRouter, Depends, HTTPException, status
from app.models.analytics import AnalyticsResponse, DailyStudyHour, DashboardSummaryResponse
from app.models.plan import WeakTopicResponse
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from datetime import datetime
from bson import ObjectId
import asyncio


router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/", response_model=AnalyticsResponse)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    analytics = await db["analytics"].find_one({"user_id": user_id})
    if not analytics:
        # Create default record if not found
        analytics = {
            "user_id": user_id,
            "study_hours": [],
            "quizzes_attempted": 0,
            "overall_accuracy": 0.0,
            "completion_percentage": 0.0,
            "exam_readiness_score": 0.0,
            "weak_topics_count": 0,
            "last_updated": datetime.utcnow()
        }
        result = await db["analytics"].insert_one(analytics)
        analytics["_id"] = str(result.inserted_id)
    else:
        # Recalculate exam readiness intelligently
        acc = analytics.get("overall_accuracy", 0.0)
        comp = analytics.get("completion_percentage", 0.0)
        quizzes = min(10, analytics.get("quizzes_attempted", 0)) * 2 # max 20 points from sheer effort
        weak = analytics.get("weak_topics_count", 0) * 5 # subtract 5 points per weak topic
        
        # Base formula: Accuracy (max 50) + Completion (max 30) + Quizzes effort (max 20) - Weak Topics penalty
        base_score = (acc * 0.5) + (comp * 0.3) + quizzes - weak
        exam_readiness = max(0.0, min(100.0, base_score))
        
        analytics["exam_readiness_score"] = exam_readiness
        analytics["_id"] = str(analytics["_id"])
        
    return analytics

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    async def fetch_analytics():
        analytics = await db["analytics"].find_one({"user_id": user_id})
        if not analytics:
            analytics = {
                "user_id": user_id,
                "study_hours": [],
                "quizzes_attempted": 0,
                "overall_accuracy": 0.0,
                "completion_percentage": 0.0,
                "exam_readiness_score": 0.0,
                "weak_topics_count": 0,
                "last_updated": datetime.utcnow()
            }
            result = await db["analytics"].insert_one(analytics)
            analytics["_id"] = str(result.inserted_id)
        else:
            # Recalculate exam readiness intelligently in memory (read-only)
            acc = analytics.get("overall_accuracy", 0.0)
            comp = analytics.get("completion_percentage", 0.0)
            quizzes = min(10, analytics.get("quizzes_attempted", 0)) * 2
            weak = analytics.get("weak_topics_count", 0) * 5
            
            base_score = (acc * 0.5) + (comp * 0.3) + quizzes - weak
            exam_readiness = max(0.0, min(100.0, base_score))
            
            analytics["exam_readiness_score"] = exam_readiness
            analytics["_id"] = str(analytics["_id"])
        return analytics

    async def fetch_plan():
        plan = await db["studyPlans"].find_one({"user_id": user_id}, sort=[("created_at", -1)])
        if plan:
            plan["_id"] = str(plan["_id"])
        return plan

    async def fetch_weak_topics():
        cursor = db["weakTopics"].find({"user_id": user_id}).sort("occurrences", -1)
        weak_topics = []
        async for wt in cursor:
            wt["_id"] = str(wt["_id"])
            weak_topics.append(wt)
        return weak_topics

    async def fetch_documents():
        cursor = db["documents"].find({"user_id": user_id}).sort("upload_date", -1)
        documents = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            documents.append(doc)
        return documents

    analytics, plan, weak_topics, documents = await asyncio.gather(
        fetch_analytics(),
        fetch_plan(),
        fetch_weak_topics(),
        fetch_documents()
    )

    return {
        "analytics": analytics,
        "active_plan": plan,
        "weak_topics": weak_topics,
        "documents": documents
    }

@router.post("/study-hours", response_model=AnalyticsResponse)
async def log_study_hours(
    log_data: DailyStudyHour,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    analytics = await db["analytics"].find_one({"user_id": user_id})
    if not analytics:
        analytics = {
            "user_id": user_id,
            "study_hours": [],
            "quizzes_attempted": 0,
            "overall_accuracy": 0.0,
            "completion_percentage": 0.0,
            "exam_readiness_score": 0.0,
            "weak_topics_count": 0,
            "last_updated": datetime.utcnow()
        }
        await db["analytics"].insert_one(analytics)
        
    # Check if this date already has hours logged
    study_hours = analytics.get("study_hours", [])
    updated = False
    for item in study_hours:
        if item["date"] == log_data.date:
            item["hours"] = log_data.hours
            updated = True
            break
            
    if not updated:
        study_hours.append({"date": log_data.date, "hours": log_data.hours})
        
    # Update DB
    await db["analytics"].update_one(
        {"user_id": user_id},
        {"$set": {"study_hours": study_hours, "last_updated": datetime.utcnow()}}
    )
    
    # Retrieve updated entry
    updated_analytics = await db["analytics"].find_one({"user_id": user_id})
    updated_analytics["_id"] = str(updated_analytics["_id"])
    return updated_analytics

@router.get("/weak-topics", response_model=list[WeakTopicResponse])
async def list_weak_topics(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    cursor = db["weakTopics"].find({"user_id": user_id}).sort("occurrences", -1)
    weak_topics = []
    async for wt in cursor:
        wt["_id"] = str(wt["_id"])
        weak_topics.append(wt)
    return weak_topics
