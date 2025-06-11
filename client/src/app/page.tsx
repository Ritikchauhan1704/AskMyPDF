import Chat from "@/components/Chat";
import FileUpload from "@/components/FileUpload";

export default function Home() {
  return (
    <div className="flex flex-row w-screen h-screen">
      <div className="h-full w-[35vw] border-r border-gray-300">
        <FileUpload />
      </div>
      <div className="h-full w-[65vw]">
        <Chat />
      </div>
    </div>
  );
}