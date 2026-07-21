import { ChatWindow } from "@/components/chat/chat-window";

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <ChatWindow chatId={chatId} />;
}
