from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DocumentBase(BaseModel):
    filename: str
    file_type: str
    file_size: int
    status: str = "processing" # processing, active, failed

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: str = Field(..., alias="_id")
    user_id: str
    upload_date: datetime
    qdrant_collection: Optional[str] = None
    summary: Optional[str] = None

    class Config:
        populate_by_name = True
