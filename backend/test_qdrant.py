import asyncio
from qdrant_client import QdrantClient

def test_qdrant():
    client = QdrantClient(path="./qdrant_data")
    collections = client.get_collections().collections
    print("Collections:")
    for col in collections:
        print(f" - {col.name}")
        # Scroll points
        points, next_page = client.scroll(
            collection_name=col.name,
            limit=5,
            with_payload=True,
            with_vectors=False
        )
        print(f"   Found {len(points)} points. Example payloads:")
        for p in points:
            print(f"     Payload: {p.payload}")

if __name__ == "__main__":
    test_qdrant()
