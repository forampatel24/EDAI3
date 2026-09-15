from .embeddings import get_chroma_client, embed_texts

def retrieve(collection_name: str, query: str, top_k: int = 5):
    client = get_chroma_client()
    try:
        coll = client.get_collection(collection_name)
    except Exception as e:
        return []
    q_emb = embed_texts([query])[0]
    results = coll.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    chunks = []
    if results["documents"] and len(results["documents"][0]) > 0:
        for i in range(len(results["documents"][0])):
            chunks.append({
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
                "score": 1 - (results["distances"][0][i] if results["distances"] else 0)  # cosine
            })
    return chunks
