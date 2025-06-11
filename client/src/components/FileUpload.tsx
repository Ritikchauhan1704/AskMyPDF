"use client";

import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { toast } from "sonner";

export default function FileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const upload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        toast.error("No file selected. Please upload a PDF.");
        return;
      }

      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.");
        return;
      }

      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/upload/pdf`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          toast.error("Upload failed: " + errText);
          return;
        }

        const data = await res.json();
        toast.success("PDF uploaded successfully!");
        setUploadedFiles((prev) => [...prev, file]);
      } catch (err) {
        console.error("Error uploading PDF:", err);
        toast.error("Something went wrong during upload.");
      }
    };

    input.click();
  };

  return (
    <div className="flex flex-col items-center justify-start p-6 w-full h-full space-y-6">
      <div
        onClick={upload}
        className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center 
        bg-white/10 cursor-pointer transition-all duration-300 ease-in-out shadow-lg 
        hover:bg-white/20 hover:scale-105 hover:ring-2 hover:ring-blue-400 hover:shadow-xl"
      >
        <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold text-center">
          Click to upload your PDF
        </h3>
        <p className="text-sm text-gray-300 mt-2">
          Only .pdf files are supported
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="w-full max-w-md mt-4 space-y-2">
          <h4 className="text-lg font-medium">Uploaded Files:</h4>
          <ul className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <li
                key={index}
                className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg text-sm  shadow"
              >
                <FileText className="text-blue-400 w-5 h-5" />
                <span className="truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
