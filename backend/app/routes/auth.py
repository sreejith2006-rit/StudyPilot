from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.database.mongodb import get_database
from app.middleware.auth import get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    db = get_database()
    
    # Check if user already exists
    existing_user = await db["users"].find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user document
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    result = await db["users"].insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Initialize blank analytics for the user
    await db["analytics"].insert_one({
        "user_id": user_id,
        "study_hours": [],
        "quizzes_attempted": 0,
        "overall_accuracy": 0.0,
        "completion_percentage": 0.0,
        "exam_readiness_score": 0.0,
        "weak_topics_count": 0,
        "last_updated": datetime.utcnow()
    })
    
    # Generate token
    token = create_access_token(user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name
        }
    }

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    db = get_database()
    
    # Find user
    user = await db["users"].find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_id = str(user["_id"])
    token = create_access_token(user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "full_name": user["full_name"]
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
