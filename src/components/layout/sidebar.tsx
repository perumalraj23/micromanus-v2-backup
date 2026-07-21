"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Sparkles,
  MessageSquare,
  BarChart3,
  Settings,
  MoreHorizontal,
  Pencil,
  Trash2,
  LogOut,
  Coins,
} from "lucide-react";
import { useChats } from "@/components/chat/chats-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn, truncate } from "@/lib/utils";

export function Sidebar({
  user,
  onNavigate,
}: {
  user: { name: string; avatarUrl: string | null; credits: number };
  onNavigate?: () => void;
}) {
  const { chats, loading, createChat, renameChat, deleteChat } = useChats();
  const pathname = usePathname();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) inputRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        createChat();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createChat]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (title) renameChat(id, title);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold">MicroManus</span>
      </div>

      <div className="px-3">
        <Button className="w-full justify-start gap-2" onClick={() => createChat()}>
          <Plus className="h-4 w-4" /> New research
          <kbd className="ml-auto rounded border border-white/20 px-1.5 text-[10px] opacity-70">⌘K</kbd>
        </Button>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-3">
        {[
          { href: "/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/settings", label: "Settings", icon: Settings },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
              pathname === item.href && "bg-muted font-medium"
            )}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-3">
        <p className="px-1 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Chats
        </p>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">No chats yet — start your first research.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {chats.map((chat) => {
              const active = pathname === `/chat/${chat.id}`;
              return (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm hover:bg-muted",
                    active && "bg-muted"
                  )}
                >
                  {renamingId === chat.id ? (
                    <Input
                      ref={inputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(chat.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="h-7 flex-1"
                    />
                  ) : (
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={onNavigate}
                      className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{truncate(chat.title, 26)}</span>
                    </Link>
                  )}

                  {renamingId !== chat.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="shrink-0 rounded-md p-1 opacity-0 hover:bg-border group-hover:opacity-100 cursor-pointer"
                          aria-label="Chat options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingId(chat.id);
                            setRenameValue(chat.title);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ id: chat.id, title: chat.title })}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            user.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="h-3 w-3 text-primary" /> {user.credits} credits
          </p>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.title}" and all of its messages will be permanently removed. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteChat(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
