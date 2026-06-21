import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def test_conn():
    uri = os.getenv("MONGO_URI")
    print(f"Connecting to {uri}")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command('ping')
        print("Connected successfully!")
    except Exception as e:
        print(f"Failed to connect: {e}")

asyncio.run(test_conn())
