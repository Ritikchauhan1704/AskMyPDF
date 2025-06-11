import { Hono } from "hono";
import { cors } from "hono/cors";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";

const app = new Hono();

const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.text("Hono!"));

app.post("/upload/pdf", async (c) => {
  const body = await c.req.parseBody({ all: true });

  const file = body["pdf"] as File | undefined;

  if (!file || file.type !== "application/pdf") {
    return c.text("Only PDF files are allowed", 400);
  }

  // Save file to disk (in `uploads/` folder)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = `./uploads/${file.name}`;

  await Bun.write(filePath, buffer);

  await queue.add("file-ready", {
    filename: file.name,
    destination: "./uploads",
    path: filePath,
  });
  return c.json({ message: "File uploaded successfully", filename: file.name });
});
app.get("/chat", async (c) => {
  const userQuery = c.req.query("q"); // Assuming your query is ?q=...

  if (!userQuery) {
    return c.json({ error: "Missing query parameter `q`" }, 400);
  }
  const qdrantClient = new QdrantClient({
    url: "http://localhost:6333",
  });

  const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "embedding-001",
    apiKey: process.env.GOOGLE_API_KEY!,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      client: qdrantClient,
      collectionName: "pdf-embeddings",
    }
  );

  const retriever = vectorStore.asRetriever({ k: 4 });
  const contextDocs = await retriever.invoke(userQuery);

  const context = contextDocs
    .map((doc, i) => `(${i + 1}) ${doc.pageContent.trim().slice(0, 1000)}`) // limit content size
    .join("\n\n");

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GOOGLE_API_KEY!,
  });

  const response = await model.pipe(new StringOutputParser()).invoke([
    {
      role: "system",
      content:
        "You are a helpful AI assistant that answers questions based strictly on the provided document context.",
    },
    {
      role: "user",
      content: `Here is the extracted context from PDF documents:\n\n${context}`,
    },
    {
      role: "user",
      content: `Question: ${userQuery}\n\nAnswer in a clear and concise manner based only on the above context.`,
    },
  ]);

  return c.json({
    answer: response,
    matchedChunks: contextDocs.map((d, i) => ({
      chunk: i + 1,
      metadata: d.metadata,
    })),
  });
});

export default app;
