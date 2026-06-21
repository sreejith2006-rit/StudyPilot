from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Dict, Any, Optional

# Study Plan Schemas
class StudyPlanCreate(BaseModel):
    exam_date: date
    daily_study_hours: float = Field(..., gt=0, lt=24)
    subjects: List[str]

class StudyPlanResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    exam_date: date
    daily_study_hours: float
    subjects: List[str]
    daily_plan: Dict[str, Any]  # Structure for daily planner tasks
    weekly_plan: Dict[str, Any] # Structure for weekly milestones
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

# Weak Topic Schemas
class WeakTopicBase(BaseModel):
    topic_name: str
    confidence_level: str = "low"  # low, medium, high
    quiz_accuracy: float = 0.0
    occurrences: int = 1

class WeakTopicResponse(WeakTopicBase):
    id: str = Field(..., alias="_id")
    user_id: str
    last_evaluated_at: datetime

    class Config:
        populate_by_name = True

# Revision Schedule Schemas
class RevisionScheduleCreate(BaseModel):
    study_plan_id: str
    topics_to_revise: List[str]

class RevisionScheduleResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    study_plan_id: str
    revision_dates: List[date]
    revision_plan: Optional[Dict[str, List[str]]] = None
    status: str = "pending" # pending, completed, rescheduled
    weak_topics_focused: List[str]
    created_at: datetime

    class Config:
        populate_by_name = True

