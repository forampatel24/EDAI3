## 1. RAG-Based Educational Content Generator

### Project Title

**Curriculum-Grounded Learning Content Generation System**

### Problem

Generic AI tools can generate educational material, but the output may not match the prescribed syllabus, textbooks or academic level.

### Proposed System

Build a RAG application that retrieves content from approved textbooks, lecture notes, syllabus documents and question banks before generating educational material.

### Example Input

“Create a lesson on Newton’s laws for Class 11 students.”

### Generated Output

* Topic explanation grounded in uploaded material
* Key concepts and definitions
* Worked examples
* Multiple-choice and descriptive questions
* Difficulty-based quizzes
* Revision notes
* Source references to textbook pages or documents

### Main Components

* PDF and document ingestion
* Text chunking and embeddings
* Vector database such as ChromaDB, FAISS or Qdrant
* Semantic retrieval
* LLM-based content generation
* Citation and grounding validator
* Teacher review interface

### GenAI Concepts Demonstrated

RAG, embeddings, vector search, prompt engineering, grounded generation and hallucination control.

### Evaluation

Measure retrieval relevance, syllabus coverage, factual correctness, citation accuracy and teacher ratings.

### Extension

Generate different versions for students, teachers and exam preparation from the same knowledge base.

