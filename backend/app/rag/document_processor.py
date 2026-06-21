import os
import logging
from typing import List
from langchain_community.document_loaders import PyMuPDFLoader, Docx2txtLoader, UnstructuredPowerPointLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient
from app.config import settings

logger = logging.getLogger("studypilot.rag.processor")

# Initialize embeddings globally to avoid reloading the model for each file
embeddings = None

def get_embeddings():
    global embeddings
    if embeddings is None:
        logger.info("Loading BAAI/bge-small-en-v1.5 embeddings model...")
        embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    return embeddings

def is_qdrant_server_active() -> bool:
    if not settings.QDRANT_HOST:
        return False
    import socket
    from urllib.parse import urlparse
    try:
        parsed = urlparse(settings.QDRANT_HOST)
        host = parsed.hostname or "localhost"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False

def get_qdrant_client():
    if is_qdrant_server_active():
        return QdrantClient(url=settings.QDRANT_HOST, api_key=settings.QDRANT_API_KEY or None)
    return QdrantClient(path="./qdrant_data")

def load_document_text(file_path: str) -> str:
    """
    Parses a document file and extracts all its text content.
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return ""
        
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    loader = None
    if ext == ".pdf":
        loader = PyMuPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".pptx":
        loader = UnstructuredPowerPointLoader(file_path)
    else:
        logger.error(f"Unsupported extension for text loading: {ext}")
        return ""
        
    try:
        documents = loader.load()
        return "\n".join([doc.page_content for doc in documents])
    except Exception as e:
        logger.error(f"Failed to load text content from {file_path}: {e}")
        return ""

def process_file_to_qdrant(file_path: str, collection_name: str, metadata: dict):
    """
    Parses a file, chunks the text, computes embeddings, and stores in Qdrant.
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
        
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    loader = None
    if ext == ".pdf":
        loader = PyMuPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".pptx":
        loader = UnstructuredPowerPointLoader(file_path)
    else:
        logger.error(f"Unsupported extension for parsing: {ext}")
        return False
        
    try:
        documents = loader.load()
    except Exception as e:
        logger.error(f"Failed to load document {file_path}: {e}")
        return False

    # Inject custom metadata to each document chunk
    for doc in documents:
        doc.metadata.update(metadata)

    # Chunking
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    logger.info(f"Split document into {len(chunks)} chunks.")

    if not chunks:
        logger.warning(f"No text extracted from {file_path}.")
        return True # Return true as parsing technically "succeeded" but was empty
        
    # Generate embeddings and insert to Qdrant
    embed_model = get_embeddings()
    
    try:
        if is_qdrant_server_active():
            Qdrant.from_documents(
                documents=chunks,
                embedding=embed_model,
                url=settings.QDRANT_HOST,
                api_key=settings.QDRANT_API_KEY or None,
                collection_name=collection_name,
                force_recreate=True
            )
            logger.info(f"Successfully inserted {len(chunks)} vectors into Qdrant collection '{collection_name}' via Qdrant server.")
        else:
            Qdrant.from_documents(
                documents=chunks,
                embedding=embed_model,
                path="./qdrant_data",
                collection_name=collection_name,
                force_recreate=True
            )
            logger.info(f"Successfully inserted {len(chunks)} vectors into Qdrant collection '{collection_name}' locally.")
        return True
    except Exception as e:
        logger.error(f"Failed to insert into Qdrant: {e}")
        return False
