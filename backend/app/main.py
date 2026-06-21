from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import auth, documents, plans, quizzes, analytics, revision, tutor

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event: connect to MongoDB
    await connect_to_mongo()
    yield
    # Shutdown event: close connection
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins (tighten later for prod) from env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(plans.router)
app.include_router(quizzes.router)
app.include_router(analytics.router)
app.include_router(revision.router)
app.include_router(tutor.router)

@app.get("/")
async def root():
    return {"status": "online", "message": "Welcome to StudyPilot AI API"}
