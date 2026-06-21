import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.vectorstores import Qdrant
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from app.rag.document_processor import get_embeddings, get_qdrant_client
from app.config import settings

logger = logging.getLogger("studypilot.rag.qa")

def get_tutor_chain(collection_name: str):
    """
    Returns a LangChain retrieval chain for querying the specific collection.
    """
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL, 
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
        max_retries=0
    )

    embed_model = get_embeddings()
    q_client = get_qdrant_client()

    # Make sure the collection exists first, otherwise it will crash
    try:
        q_client.get_collection(collection_name)
    except Exception as e:
        logger.error(f"Collection {collection_name} not found in Qdrant: {e}")
        return None

    # Load vector store for the specific document collection
    vectorstore = Qdrant(
        client=q_client,
        collection_name=collection_name,
        embeddings=embed_model
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    system_prompt = (
        "You are an expert AI Study Tutor. Use the following pieces of retrieved context to answer the student's question.\n"
        "RULES:\n"
        "1. You MUST answer ONLY using the provided context.\n"
        "2. If you don't know the answer or the context is irrelevant, say 'I cannot find the answer in your uploaded materials.' Do NOT hallucinate.\n"
        "3. Always format your responses in a structured, point-wise (bullet points or numbered list) format. Bold key concepts or terms. Cite your sources if possible based on the metadata (e.g. filename).\n"
        "4. Use subheadings (e.g. '### [Subheading]') to organize your answer. Avoid large, monolithic paragraph blocks.\n\n"
        "Context:\n"
        "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    return rag_chain

async def ask_question(collection_names: list[str], question: str):
    """
    Queries across all provided document collections, aggregates and ranks
    the most relevant context chunks, and runs the LLM QA chain.
    If no relevant context is found or no collections exist, it falls back to its general knowledge.
    Returns a dict with "answer" and "citations".
    """
    if not settings.is_gemini_key_valid():
        return {
            "answer": "I cannot find the answer (Gemini API key is invalid or not configured).",
            "citations": []
        }

    relevant_docs = []

    if collection_names:
        embed_model = get_embeddings()
        q_client = get_qdrant_client()
        all_docs = []

        # Query each collection to retrieve candidate chunks
        for col in collection_names:
            try:
                q_client.get_collection(col)
            except Exception as e:
                logger.error(f"Collection {col} not found in Qdrant: {e}")
                continue

            vectorstore = Qdrant(
                client=q_client,
                collection_name=col,
                embeddings=embed_model
            )

            try:
                # Get up to 3 context chunks per collection
                docs_with_scores = vectorstore.similarity_search_with_score(question, k=3)
                for doc, score in docs_with_scores:
                    doc.metadata["score"] = score
                    if "filename" not in doc.metadata:
                        doc.metadata["filename"] = "Unknown Source"
                    all_docs.append(doc)
            except Exception as e:
                logger.error(f"Error querying vector store for {col}: {e}")

        if all_docs:
            # Sort all retrieved documents by similarity score in descending order (higher is better)
            all_docs.sort(key=lambda x: x.metadata.get("score", 0.0), reverse=True)
            # Pick the top 5 overall most relevant chunks
            relevant_docs = all_docs[:5]

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
        max_retries=0
    )

    system_prompt = (
        "You are an expert AI Study Tutor. Use the provided context to answer the student's question.\n"
        "RULES:\n"
        "1. Prioritize using the retrieved context to answer the question, and cite your sources if possible based on the metadata (specifically the filename).\n"
        "2. If the context is empty, does not contain the answer, or is irrelevant to the question, answer the question accurately using your own general knowledge.\n"
        "3. If you use the retrieved context to answer, you MUST list the exact filename(s) of the cited document(s) at the very end of your response in the format: 'Sources: filename1, filename2'.\n"
        "4. If you did NOT use the retrieved context (i.e. you answered from general knowledge), do NOT include the 'Sources:' line at the end.\n"
        "5. Always format your responses in a structured, point-wise (bullet points or numbered list) format. Avoid dense, long paragraphs.\n"
        "6. Use subheadings (e.g. '### [Subheading]') to organize different parts of your answer.\n"
        "7. Use bolding (`**term**`) for key concepts, terms, metrics, or arguments to make the content clean, attractive, and easy to scan.\n"
        "8. Use Markdown code blocks for any formulas, code snippets, or formatted tables where appropriate.\n\n"
        "Context:\n"
        "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    from langchain_core.prompts import PromptTemplate
    document_prompt = PromptTemplate(
        input_variables=["page_content", "filename"],
        template="Document Name: {filename}\nDocument Content:\n{page_content}"
    )

    question_answer_chain = create_stuff_documents_chain(llm, prompt, document_prompt=document_prompt)

    try:
        # Run QA chain on the retrieved context documents (can be empty list)
        answer = await question_answer_chain.ainvoke({"input": question, "context": relevant_docs})
    except Exception as e:
        logger.error(f"Error invoking QA chain: {e}")
        return {
            "answer": "Sorry, I encountered an error answering your question.",
            "citations": []
        }

    # Extract unique citations from the Sources line if present
    citations = []
    answer_text = answer.strip()

    if "Sources:" in answer_text:
        parts = answer_text.rsplit("Sources:", 1)
        answer_text = parts[0].strip()
        sources_str = parts[1].strip()
        raw_citations = [s.strip() for s in sources_str.split(",") if s.strip()]
        
        valid_filenames = {doc.metadata.get("filename") for doc in relevant_docs if doc.metadata.get("filename")}
        for citation in raw_citations:
            clean_citation = citation.strip(".`\"'*")
            if clean_citation in valid_filenames:
                citations.append(clean_citation)
            else:
                for fname in valid_filenames:
                    if clean_citation in fname or fname in clean_citation:
                        citations.append(fname)
                        break
        # Remove duplicates
        citations = list(dict.fromkeys(citations))

    return {
        "answer": answer_text,
        "citations": citations
    }
