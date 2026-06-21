from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import settings
from app.database.mongodb import get_database
from app.utils.security import decode_access_token
from bson import ObjectId

# Setup bearer token authentication
security_scheme = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
        
    db = get_database()
    # Find user by ID in MongoDB
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db["users"].find_one({"_id": user_id}) # Fallback if stored as string
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Return user object, converting ObjectId to string for easy JSON serialization
    user["_id"] = str(user["_id"])
    return user
