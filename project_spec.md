# Project Specification

## Project Title

**Curriculum-Grounded Learning Content Generation System**

## 1. Project Overview

The Curriculum-Grounded Learning Content Generation System is a Retrieval-Augmented Generation (RAG) application that creates educational content using approved academic sources such as textbooks, lecture notes, syllabus documents, and question banks.

The system is designed to reduce generic or syllabus-mismatched AI responses by retrieving relevant source material before generating learning content.

## 2. Problem Statement

Generic AI tools can generate explanations, examples, and questions, but their responses may:

- Not match the prescribed syllabus.
- Use an inappropriate academic level.
- Include unsupported or inaccurate information.
- Omit important concepts from approved learning material.
- Provide no clear reference to the source used.

Students and teachers need a system that generates useful educational material while remaining grounded in trusted academic documents.

## 3. Objectives

The project aims to:

1. Ingest approved educational documents.
2. Extract and preprocess text from PDFs and other supported documents.
3. Split documents into meaningful text chunks.
4. Convert chunks into vector embeddings.
5. Store embeddings in a vector database.
6. Retrieve relevant content for a user query.
7. Generate educational material using retrieved context.
8. Provide source references for generated content.
9. Validate generated content for grounding and citation accuracy.
10. Support teacher review and feedback.
11. Generate content for different learning purposes and audiences.

## 4. Target Users

### Students

Students can use the system to generate:

- Topic explanations.
- Revision notes.
- Worked examples.
- Multiple-choice questions.
- Descriptive questions.
- Difficulty-based quizzes.
- Exam-preparation material.

### Teachers

Teachers can use the system to:

- Prepare lessons.
- Generate question banks.
- Create quizzes.
- Review AI-generated educational content.
- Check whether content matches approved sources.
- Produce different versions of the same topic.

## 5. Example User Request

> Create a lesson on Newton's laws for Class 11 students.

## 6. Expected Output

The system should generate, where requested:

- Topic explanation.
- Key concepts.
- Definitions.
- Worked examples.
- Multiple-choice questions.
- Descriptive questions.
- Difficulty-based quizzes.
- Revision notes.
- Source references to relevant documents or textbook pages.

## 7. Functional Requirements

### FR-01: Document Upload

The system shall allow authorized users to upload educational documents, including:

- Textbooks.
- Lecture notes.
- Syllabus documents.
- Question banks.
- Reference PDFs.

### FR-02: Document Processing

The system shall:

- Extract text from uploaded documents.
- Preserve document metadata where possible.
- Identify page numbers for source referencing.
- Handle basic document-processing errors.
- Prepare extracted text for chunking.

### FR-03: Text Chunking

The system shall divide extracted text into manageable chunks.

Chunking should:

- Preserve contextual meaning.
- Avoid unnecessarily small fragments.
- Include configurable chunk size and overlap.
- Retain document and page metadata.

### FR-04: Embedding Generation

The system shall convert text chunks into numerical vector embeddings using an embedding model.

### FR-05: Vector Storage

The system shall store embeddings and metadata in a vector database.

Possible technologies include:

- ChromaDB.
- FAISS.
- Qdrant.

The implementation should select one primary vector database for the first version.

### FR-06: Semantic Retrieval

The system shall:

1. Accept a user query.
2. Convert the query into an embedding.
3. Search the vector database.
4. Retrieve the most relevant chunks.
5. Pass the retrieved context to the generation model.

### FR-07: Educational Content Generation

The system shall generate content based on:

- User query.
- Retrieved source context.
- Academic level.
- Requested content type.
- Requested difficulty.
- Desired output length.

### FR-08: Grounded Generation

The system shall instruct the language model to:

- Use retrieved material as the primary source.
- Avoid unsupported claims.
- Clearly state when information is unavailable.
- Avoid inventing textbook references.
- Preserve the intended academic level.

### FR-09: Citation and Source References

The system shall provide references for retrieved content.

References should include, where available:

- Document name.
- Page number.
- Source chunk identifier.
- Relevant supporting passage.

### FR-10: Grounding Validation

The system shall validate generated content for:

- Support from retrieved context.
- Citation presence.
- Citation accuracy.
- Unsupported claims.
- Potential hallucinations.

### FR-11: Teacher Review

The system should provide a review interface where teachers can:

- Read generated content.
- Inspect retrieved sources.
- Accept or reject content.
- Edit generated content.
- Submit feedback.
- Identify unsupported statements.

### FR-12: Content Personalization

The system should support content generation for:

- Students.
- Teachers.
- Revision.
- Exam preparation.

## 8. Non-Functional Requirements

### NFR-01: Accuracy

Generated content should be factually correct and supported by the approved source material.

### NFR-02: Grounding

The system should prioritize retrieved documents over unsupported model knowledge.

### NFR-03: Usability

The interface should be simple enough for students and teachers with limited technical knowledge.

### NFR-04: Performance

For a normal query, the system should retrieve relevant chunks and produce a response within an acceptable response time for the selected model and hardware.

### NFR-05: Maintainability

The system should separate document ingestion, retrieval, generation, validation, and user-interface modules.

### NFR-06: Privacy

Uploaded educational documents and user queries should be handled securely and should not be exposed to unauthorized users.

### NFR-07: Traceability

Generated content should be traceable to the source documents used during retrieval.

## 9. Proposed System Architecture

```text
                    +----------------------+
                    |      User Interface  |
                    | Student / Teacher    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   Query Processing   |
                    | Topic, Level, Type   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |  Embedding Model     |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   Vector Database    |
                    | Chroma / FAISS /      |
                    | Qdrant               |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Relevant Source      |
                    | Chunk Retrieval      |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Prompt Construction  |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |      LLM Generator   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Grounding and        |
                    | Citation Validator   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Educational Output   |
                    | + Source References  |
                    +----------------------+
```

## 10. Main Modules

### Module 1: Document Ingestion

Responsibilities:

- Upload documents.
- Validate file types.
- Extract text.
- Capture metadata.
- Store original files or references.

### Module 2: Preprocessing and Chunking

Responsibilities:

- Clean extracted text.
- Remove unnecessary formatting.
- Split text into chunks.
- Preserve page and document metadata.

### Module 3: Embedding and Indexing

Responsibilities:

- Generate embeddings.
- Create vector records.
- Store vectors in the selected database.
- Support indexing of new documents.

### Module 4: Retrieval

Responsibilities:

- Process user queries.
- Generate query embeddings.
- Retrieve top-k relevant chunks.
- Rank or filter results.
- Return source metadata.

### Module 5: Prompt Engineering

Responsibilities:

- Build prompts using user requirements and retrieved context.
- Specify academic level.
- Specify content format.
- Instruct the model not to hallucinate.
- Require source references.

### Module 6: Content Generation

Responsibilities:

- Generate explanations.
- Generate examples.
- Generate questions and quizzes.
- Generate revision notes.
- Format responses for the user.

### Module 7: Validation

Responsibilities:

- Check generated claims against retrieved context.
- Check citation coverage.
- Flag unsupported content.
- Identify missing or weak references.
- Return validation feedback.

### Module 8: Teacher Review Interface

Responsibilities:

- Display generated content.
- Display supporting sources.
- Allow editing.
- Allow approval or rejection.
- Collect feedback.

## 11. Suggested Technology Stack

| Layer | Suggested Technology |
|---|---|
| Programming language | Python |
| Backend | FastAPI or Flask |
| User interface | Streamlit or a web frontend |
| Document processing | PyMuPDF, pypdf, or equivalent |
| Text chunking | Custom Python logic or LangChain utilities |
| Embeddings | Sentence Transformers or another embedding model |
| Vector database | ChromaDB, FAISS, or Qdrant |
| LLM | An available instruction-following language model |
| Validation | Rule-based checks plus LLM-assisted validation |
| Storage | Local storage or a database for metadata |
| Testing | Pytest |

The first implementation should choose one technology per layer to avoid unnecessary complexity.

## 12. Recommended First-Version Stack

For a manageable student project, use:

- Python.
- Streamlit.
- PyMuPDF.
- Sentence Transformers.
- ChromaDB.
- An instruction-following LLM.
- Pytest.

This stack supports a complete RAG workflow while remaining relatively easy to demonstrate and extend.

## 13. Core Workflow

### A. Knowledge Base Creation

1. Teacher uploads approved documents.
2. The system extracts text.
3. Text is split into chunks.
4. Embeddings are generated.
5. Chunks and metadata are stored in the vector database.

### B. Query and Generation

1. User enters a topic or learning request.
2. User selects academic level and content type.
3. The system embeds the query.
4. Relevant chunks are retrieved.
5. A grounded prompt is created.
6. The LLM generates educational content.
7. The validator checks grounding and citations.
8. The final response is shown with source references.

## 14. User Interface Requirements

The interface should include:

### Document Management

- Upload document.
- View indexed documents.
- Display processing status.
- Show document metadata.

### Content Generation

- Topic/query input.
- Academic-level selector.
- Content-type selector.
- Difficulty selector.
- Output-length selector.
- Generate button.

### Results

- Generated educational content.
- Retrieved source excerpts.
- Document and page references.
- Validation warnings.
- Copy or export option.

### Teacher Review

- Approve content.
- Edit content.
- Reject content.
- Add feedback.

## 15. Data Model

### Document

```text
Document
- document_id
- file_name
- subject
- academic_level
- uploaded_by
- upload_timestamp
- processing_status
```

### Text Chunk

```text
TextChunk
- chunk_id
- document_id
- page_number
- chunk_text
- embedding_id
- metadata
```

### User Query

```text
UserQuery
- query_id
- user_id
- query_text
- academic_level
- content_type
- difficulty
- timestamp
```

### Generated Content

```text
GeneratedContent
- generation_id
- query_id
- generated_text
- source_chunk_ids
- validation_status
- teacher_feedback
- timestamp
```

## 16. Prompt Requirements

The generation prompt should include:

1. The user's request.
2. Academic level.
3. Requested output format.
4. Retrieved source context.
5. Grounding instructions.
6. Citation instructions.

Example prompt structure:

```text
You are an educational content generator.

Generate content for:
- Topic: {topic}
- Academic level: {academic_level}
- Content type: {content_type}
- Difficulty: {difficulty}

Use only the retrieved source context below as the primary basis
for factual claims.

If the context does not contain enough information, clearly state
that the information is unavailable rather than inventing details.

Retrieved source context:
{retrieved_chunks}

Provide source references for claims wherever possible.
```

## 17. Evaluation Plan

The system should be evaluated using the following criteria.

### 17.1 Retrieval Relevance

Measure whether retrieved chunks are relevant to the user's query.

Possible metrics:

- Precision@k.
- Recall@k.
- Mean Reciprocal Rank.
- Human relevance ratings.

### 17.2 Syllabus Coverage

Check whether generated content covers the requested syllabus concepts.

### 17.3 Factual Correctness

Evaluate whether generated explanations and answers are correct.

### 17.4 Citation Accuracy

Check whether references actually support the associated claims.

### 17.5 Grounding Rate

Measure the percentage of factual claims supported by retrieved source material.

### 17.6 Teacher Ratings

Ask teachers to rate:

- Relevance.
- Clarity.
- Academic appropriateness.
- Accuracy.
- Usefulness.
- Source quality.

### 17.7 Response Performance

Measure:

- Document-processing time.
- Retrieval latency.
- Generation latency.
- End-to-end response time.

## 18. Testing Requirements

### Unit Tests

Test:

- PDF text extraction.
- Chunk creation.
- Metadata preservation.
- Embedding generation.
- Retrieval behavior.
- Prompt construction.
- Citation formatting.
- Validation rules.

### Integration Tests

Test:

- Upload-to-index workflow.
- Query-to-retrieval workflow.
- Retrieval-to-generation workflow.
- Generation-to-validation workflow.

### User Acceptance Tests

Test whether:

- Students can generate useful content.
- Teachers can review content.
- Sources are understandable.
- The interface is easy to use.
- Unsupported claims are flagged.

## 19. Project Scope

### Included in the First Version

- PDF/document upload.
- Text extraction.
- Text chunking.
- Embedding generation.
- Vector search.
- RAG-based generation.
- Educational content formats.
- Source references.
- Basic grounding validation.
- Basic teacher review.

### Possible Future Extensions

- Multi-language educational content.
- Voice-based learning.
- Automatic syllabus mapping.
- Adaptive learning paths.
- Student performance tracking.
- Personalized revision schedules.
- More advanced citation verification.
- LMS integration.
- Automatic question difficulty calibration.
- Student and teacher dashboards.

## 20. Limitations

The system may be limited by:

- Poor-quality or scanned documents.
- Missing text in image-only PDFs.
- Incorrect or incomplete source material.
- Embedding quality.
- Retrieval failures.
- LLM generation errors.
- Inaccurate citation mapping.
- Limited evaluation data.
- Model latency and resource requirements.

The system should clearly communicate uncertainty and should not present unsupported information as verified fact.

## 21. Success Criteria

The project will be considered successful if it can:

1. Ingest approved educational documents.
2. Retrieve relevant source passages for a query.
3. Generate educational content grounded in those passages.
4. Produce useful explanations, examples, questions, and notes.
5. Display source references.
6. Detect or flag unsupported claims.
7. Allow a teacher to review generated content.
8. Demonstrate measurable retrieval and generation quality through evaluation.

## 22. Suggested Development Phases

### Phase 1: Project Setup

- Create repository.
- Set up Python environment.
- Select models and libraries.
- Define folder structure.

### Phase 2: Document Pipeline

- Implement upload.
- Extract text.
- Implement chunking.
- Store metadata.

### Phase 3: Vector Search

- Generate embeddings.
- Create vector database.
- Implement semantic retrieval.
- Test retrieval quality.

### Phase 4: RAG Generation

- Design prompts.
- Connect the LLM.
- Generate educational content.
- Add output formatting.

### Phase 5: Validation and Citations

- Add source references.
- Implement grounding checks.
- Add citation validation.
- Display warnings.

### Phase 6: User Interface

- Build student interface.
- Build teacher review interface.
- Add document management.

### Phase 7: Evaluation and Documentation

- Create test dataset.
- Measure retrieval relevance.
- Evaluate factual correctness.
- Collect teacher feedback.
- Document results and limitations.

## 23. Proposed Repository Structure

```text
curriculum-grounded-content-generator/
│
├── app/
│   ├── main.py
│   ├── config.py
│   ├── ui/
│   │   ├── student_view.py
│   │   └── teacher_view.py
│   ├── ingestion/
│   │   ├── document_loader.py
│   │   ├── text_extractor.py
│   │   └── chunker.py
│   ├── retrieval/
│   │   ├── embeddings.py
│   │   ├── vector_store.py
│   │   └── retriever.py
│   ├── generation/
│   │   ├── prompts.py
│   │   ├── generator.py
│   │   └── formatter.py
│   ├── validation/
│   │   ├── grounding_checker.py
│   │   └── citation_checker.py
│   └── storage/
│       └── metadata_store.py
│
├── data/
│   ├── uploads/
│   ├── processed/
│   └── vector_db/
│
├── tests/
│   ├── test_ingestion.py
│   ├── test_chunking.py
│   ├── test_retrieval.py
│   ├── test_generation.py
│   └── test_validation.py
│
├── docs/
│   ├── architecture.md
│   └── evaluation.md
│
├── requirements.txt
├── .env.example
├── README.md
└── project_spec.md
```

## 24. Final Deliverables

The completed project should include:

- Working RAG application.
- Document ingestion pipeline.
- Vector database.
- Educational content generation module.
- Grounding and citation validation.
- Student interface.
- Teacher review interface.
- Test suite.
- Evaluation report.
- Project documentation.
- Demonstration using approved educational documents.

## 25. Source Basis

This specification is based on the provided project brief for the **RAG-Based Educational Content Generator**, including its stated problem, proposed system, example input/output, main components, GenAI concepts, evaluation criteria, and extension ideas.
