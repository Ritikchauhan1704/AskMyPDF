import { Worker } from "bullmq";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import type { AttributeInfo } from "langchain/chains/query_constructor";
import { QdrantClient } from "@qdrant/js-client-rest";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    const { path, filename } = job.data;
    console.log(`Processing: ${filename}`);

    // Load PDF
    const loader = new PDFLoader(path);
    const docs = await loader.load();

    // Split into chunks
    const splitter = new CharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const splitDocs: Document[] = [];

    for (const doc of docs) {
      const pageNo =
        doc.metadata?.loc?.pageNumber || doc.metadata?.page || null;

      const chunks = await splitter.splitText(doc.pageContent);

      chunks.forEach((chunk, i) => {
        splitDocs.push(
          new Document({
            pageContent: chunk,
            metadata: {
              source: filename,
              chunk: i,
              pageNo: pageNo,
            },
          })
        );
      });
    }

    console.log(`Total chunks: ${splitDocs.length}`);

    // Setup Qdrant client
    const qdrantClient = new QdrantClient({
      url: "http://localhost:6333",
    });

    // Setup Gemini embedding model
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "embedding-001",
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    // Vector store
    const vectorStore = await QdrantVectorStore.fromDocuments(
      splitDocs,
      embeddings,
      {
        client: qdrantClient,
        collectionName: "pdf-embeddings",
      }
    );

    console.log("Embeddings stored in Qdrant");
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);
