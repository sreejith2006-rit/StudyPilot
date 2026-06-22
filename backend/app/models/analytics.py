from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Optional
from app.models.plan import StudyPlanResponse, WeakTopicResponse
from app.models.document import DocumentResponse

class DailyStudyHour(BaseModel):
    date: str # YYYY-MM-DD
    hours: float

class AnalyticsResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    study_hours: List[DailyStudyHour] = []
    quizzes_attempted: int = 0
    overall_accuracy: float = 0.0 # 0.0 - 100.0
    completion_percentage: float = 0.0 # study plan tasks completed
    exam_readiness_score: float = 0.0 # AI composite score based on metrics
    weak_topics_count: int = 0
    last_updated: datetime

    class Config:
        populate_by_name = True

class DashboardSummaryResponse(BaseModel):
    analytics: Optional[AnalyticsResponse] = None
    active_plan: Optional[StudyPlanResponse] = None
    weak_topics: List[WeakTopicResponse] = []
    documents: List[DocumentResponse] = []

