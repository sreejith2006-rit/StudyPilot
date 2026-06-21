import sys
import os
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

from app.rag.document_processor import process_file_to_qdrant

def run_test():
    file_path = "uploads/1781951001_M1 - OS.pdf"
    collection_name = "test_collection_pdf"
    metadata = {"document_id": "test_id", "filename": "M1 - OS.pdf"}
    
    print(f"Processing {file_path} to Qdrant collection {collection_name}...")
    success = process_file_to_qdrant(file_path, collection_name, metadata)
    print(f"Result: {success}")

if __name__ == "__main__":
    run_test()
