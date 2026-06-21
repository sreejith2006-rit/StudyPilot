from fastapi import APIRouter, Depends, HTTPException, status
from app.models.plan import RevisionScheduleCreate, RevisionScheduleResponse
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from app.rag.ai_generators import generate_revision_schedule_ai
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/revision", tags=["revision"])

@router.post("/generate", response_model=RevisionScheduleResponse, status_code=status.HTTP_201_CREATED)
async def generate_revision_schedule(
    schedule_data: RevisionScheduleCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["_id"]
    
    # Generate revision using Gemini
    ai_schedule = await generate_revision_schedule_ai(schedule_data.topics_to_revise)
    
    if not ai_schedule:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI revision schedule."
        )
        
    schedule_dict = {
        "user_id": user_id,
        "study_plan_id": schedule_data.study_plan_id,
        "revision_plan": ai_schedule, # Store the dict of {date: [tasks]}
        "revision_dates": list(ai_schedule.keys()), # Save it in DB too!
        "status": "pending",
        "weak_topics_focused": schedule_data.topics_to_revise,
        "created_at": datetime.utcnow()
    }
    
    result = await db["revisionSchedules"].insert_one(schedule_dict)
    schedule_dict["_id"] = str(result.inserted_id)
    
    return schedule_dict

@router.get("/", response_model=list[RevisionScheduleResponse])
async def list_revision_schedules(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    
    cursor = db["revisionSchedules"].find({"user_id": user_id}).sort("created_at", -1)
    schedules = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        # Backfill revision_dates if missing
        if "revision_dates" not in s and "revision_plan" in s:
            s["revision_dates"] = list(s["revision_plan"].keys())
            
        if isinstance(s.get("revision_dates"), list):
            # Parse dates
            parsed_dates = []
            for d in s["revision_dates"]:
                if isinstance(d, str):
                    parsed_dates.append(datetime.strptime(d, "%Y-%m-%d").date())
                else:
                    parsed_dates.append(d)
            s["revision_dates"] = parsed_dates
        else:
            s["revision_dates"] = []
        schedules.append(s)
    return schedules

