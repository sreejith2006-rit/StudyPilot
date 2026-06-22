from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger("studypilot.database")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB!")
    
    # Create indexes asynchronously to avoid COLLSCAN
    try:
        logger.info("Ensuring database indexes exist...")
        db = db_instance.db
        
        # Analytics: unique per user_id
        try:
            await db["analytics"].create_index("user_id", unique=True)
            logger.info("Index created: analytics(user_id) unique")
        except Exception as e:
            logger.warning(f"Could not create unique index on analytics(user_id): {e}. Creating non-unique index.")
            await db["analytics"].create_index("user_id")
            
        # Weak Topics: unique per (user_id, topic_name)
        try:
            await db["weakTopics"].create_index([("user_id", 1), ("topic_name", 1)], unique=True)
            logger.info("Index created: weakTopics(user_id, topic_name) unique")
        except Exception as e:
            logger.warning(f"Could not create unique index on weakTopics(user_id, topic_name): {e}. Creating non-unique index on user_id.")
            await db["weakTopics"].create_index("user_id")
            
        # Other collections index on user_id
        await db["documents"].create_index("user_id")
        await db["quizAttempts"].create_index("user_id")
        await db["studyPlans"].create_index("user_id")
        logger.info("Database index check/creation completed successfully!")
    except Exception as e:
        logger.error(f"Error checking/creating database indexes: {e}")

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_instance.client:
        db_instance.client.close()
    logger.info("MongoDB connection closed!")

def get_database():
    return db_instance.db

