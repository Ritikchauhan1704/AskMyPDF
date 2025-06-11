"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";
import Markdown from "react-markdown";

interface DocumentMetadata {
  source: string;
  pageNo: number;
}

interface IMessage {
  role: "assistant" | "user";
  content?: string;
  documents?: DocumentMetadata[];
}

export default function Chat() {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSendChatMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Disable input and clear message right away
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setMessage("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/chat?q=${message}`
      );

      const data = await res.json();

      const documents: DocumentMetadata[] = data.matchedChunks.map(
        (chunk: { metadata: { source: string; pageNo: number } }) => ({
          source: chunk.metadata.source,
          pageNo: chunk.metadata.pageNo,
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          documents,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="p-4 h-full">
      <div className="flex flex-col gap-3 h-11/12 overflow-y-auto mb-28">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-md max-w-xl ${
              msg.role === "user"
                ? "bg-cyan-100 self-end"
                : "bg-gray-100 self-start"
            }`}
          >
            <Markdown>{msg.content}</Markdown>
            {msg.role === "assistant" && msg.documents?.length ? (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-semibold">Sources:</p>
                <ul className="list-disc ml-5">
                  {msg.documents.map((doc, i) => (
                    <li key={i}>
                      {doc.source} — Page {doc.pageNo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      <form
        onSubmit={handleSendChatMessage}
        className="flex gap-3 fixed bottom-4 w-1/3"
      >
        <Input
          type="text"
          value={message}
          disabled={isLoading}
          placeholder="Type your queries"
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button disabled={!message.trim() || isLoading} type="submit">
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
