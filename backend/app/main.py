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
    allow_origins=["http://localhost:3000", "https://localhost:3000"], # Next.js dev server origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(quizzes.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(revision.router, prefix="/api")
app.include_router(tutor.router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "online", "message": "Welcome to StudyPilot AI API"}
