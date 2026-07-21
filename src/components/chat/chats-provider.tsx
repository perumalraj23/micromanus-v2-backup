"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ChatSummary } from "@/lib/types/app";

type ChatsContextValue = {
  chats: ChatSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  createChat: () => Promise<string | null>;
  renameChat: (id: string, title: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
};

const ChatsContext = createContext<ChatsContextValue | null>(null);

export function ChatsProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      if (res.ok) setChats(data.chats ?? []);
    } catch {
      // Silent: sidebar keeps showing the last known list rather than an error banner.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createChat = useCallback(async () => {
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not start a new chat.");
        return null;
      }
      setChats((prev) => [data.chat, ...prev]);
      router.push(`/chat/${data.chat.id}`);
      return data.chat.id as string;
    } catch {
      toast.error("Could not start a new chat. Please try again.");
      return null;
    }
  }, [router]);

  const renameChat = useCallback(async (id: string, title: string) => {
    const prev = chats;
    setChats((c) => c.map((chat) => (chat.id === id ? { ...chat, title } : chat)));
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        setChats(prev);
        const data = await res.json();
        toast.error(data.error ?? "Could not rename this chat.");
      }
    } catch {
      setChats(prev);
      toast.error("Could not rename this chat. Please try again.");
    }
  }, [chats]);

  const deleteChat = useCallback(
    async (id: string) => {
      const prev = chats;
      setChats((c) => c.filter((chat) => chat.id !== id));
      try {
        const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
        if (!res.ok) {
          setChats(prev);
          toast.error("Could not delete this chat.");
          return;
        }
        toast.success("Chat deleted.");
        if (window.location.pathname === `/chat/${id}`) router.push("/chat");
      } catch {
        setChats(prev);
        toast.error("Could not delete this chat. Please try again.");
      }
    },
    [chats, router]
  );

  return (
    <ChatsContext.Provider value={{ chats, loading, refresh, createChat, renameChat, deleteChat }}>
      {children}
    </ChatsContext.Provider>
  );
}

export function useChats() {
  const ctx = useContext(ChatsContext);
  if (!ctx) throw new Error("useChats must be used within ChatsProvider");
  return ctx;
}
