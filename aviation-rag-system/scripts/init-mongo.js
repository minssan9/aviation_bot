// MongoDB initialization script for Aviation RAG System

// Switch to the aviation_rag database
db = db.getSiblingDB('aviation_rag');

// Create the document_chunks collection
db.createCollection('document_chunks');

// Create indexes for efficient querying
db.document_chunks.createIndex({ "chunk_id": 1 }, { unique: true });
db.document_chunks.createIndex({ "document_id": 1 });
db.document_chunks.createIndex({ "created_at": -1 });
db.document_chunks.createIndex({ "metadata.source_file": 1 });
db.document_chunks.createIndex({ "page_number": 1 });

// Create a text index for basic text search (fallback)
db.document_chunks.createIndex({ "content": "text" });

print("Aviation RAG MongoDB initialized successfully!");
print("Collections created:");
print("- document_chunks");
print("");
print("Indexes created:");
print("- chunk_id (unique)");
print("- document_id");
print("- created_at");
print("- metadata.source_file");
print("- page_number");
print("- content (text)");

// Optional: Insert sample configuration document
db.system_config.insertOne({
    "_id": "aviation_rag_config",
    "version": "1.0.0",
    "created_at": new Date(),
    "settings": {
        "chunk_size": 512,
        "chunk_overlap": 50,
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
        "similarity_threshold": 0.3
    }
});

print("System configuration document created.");

// Create user for the aviation_rag database (optional)
// Uncomment if you want database-specific authentication
/*
db.createUser({
    user: "aviation_rag_user",
    pwd: "aviation_rag_password",
    roles: [
        {
            role: "readWrite",
            db: "aviation_rag"
        }
    ]
});
print("Database user 'aviation_rag_user' created.");
*/