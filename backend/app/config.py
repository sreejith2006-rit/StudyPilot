import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "StudyPilot AI API"
    VERSION: str = "1.0.0"
    
    # MongoDB settings
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "studypilot")
    
    # JWT authentication settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # Default 24 hours
    
    # Vector DB / AI settings
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "http://localhost:6333")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    def is_gemini_key_valid(self) -> bool:
        if not self.GEMINI_API_KEY:
            return False
        return self.GEMINI_API_KEY.startswith("AIzaSy") or self.GEMINI_API_KEY.startswith("AQ.") or len(self.GEMINI_API_KEY) > 10

settings = Settings()

