from fastapi import APIRouter, Depends, HTTPException, status
from app.models.plan import StudyPlanCreate, StudyPlanResponse
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from app.rag.ai_generators import generate_study_plan_ai
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/plans", tags=["plans"])

@router.post("/", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    plan_data: StudyPlanCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Calculate days left to check validity
    days_left = (plan_data.exam_date - datetime.utcnow().date()).days
    if days_left < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam date must be today or in the future"
        )
    
    # Call Gemini to generate the structured plan
    ai_plan = await generate_study_plan_ai(
        exam_date=plan_data.exam_date,
        daily_hours=plan_data.daily_study_hours,
        subjects=plan_data.subjects
    )
    
    if not ai_plan:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI study plan."
        )
        
    plan_dict = {
        "user_id": user_id,
        "exam_date": plan_data.exam_date.isoformat(),
        "daily_study_hours": plan_data.daily_study_hours,
        "subjects": plan_data.subjects,
        "daily_plan": ai_plan["daily_plan"],
        "weekly_plan": ai_plan["weekly_plan"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db["studyPlans"].insert_one(plan_dict)
    plan_dict["_id"] = str(result.inserted_id)
    plan_dict["exam_date"] = plan_data.exam_date # Keep as date type for pydantic serialization
    
    return plan_dict

@router.get("/active", response_model=StudyPlanResponse)
async def get_active_plan(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    # Get the latest created plan
    plan = await db["studyPlans"].find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No study plan found. Go to the Study Planner to create one."
        )
        
    plan["_id"] = str(plan["_id"])
    if isinstance(plan["exam_date"], str):
        plan["exam_date"] = datetime.strptime(plan["exam_date"], "%Y-%m-%d").date()
    return plan

@router.put("/active/tasks", response_model=dict)
async def update_task_status(
    date_key: str,
    task_id: str,
    completed: bool,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    plan = await db["studyPlans"].find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active study plan found")
        
    daily_plan = plan.get("daily_plan", {})
    if date_key not in daily_plan:
        raise HTTPException(status_code=404, detail="Date not found in study plan")
        
    # Update matching task
    tasks = daily_plan[date_key]
    updated = False
    completed_count = 0
    total_count = 0
    
    for t in tasks:
        if t["id"] == task_id:
            t["completed"] = completed
            updated = True
        if t["completed"]:
            completed_count += 1
        total_count += 1
            
    if not updated:
        raise HTTPException(status_code=404, detail="Task ID not found")
        
    # Recalculate completion percentage for analytics
    all_tasks = [t for tasks_list in daily_plan.values() for t in tasks_list]
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.get("completed", False))
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    
    await db["studyPlans"].update_one(
        {"_id": plan["_id"]},
        {"$set": {"daily_plan": daily_plan, "updated_at": datetime.utcnow()}}
    )
    
    # Update overall analytics
    await db["analytics"].update_one(
        {"user_id": user_id},
        {"$set": {"completion_percentage": completion_rate, "last_updated": datetime.utcnow()}}
    )
    
    return {"message": "Task status updated successfully", "completion_percentage": completion_rate}
