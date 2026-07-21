"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ChatsProvider } from "@/components/chat/chats-provider";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; avatarUrl: string | null; credits: number };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ChatsProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden w-72 shrink-0 border-r border-border md:block">
          <Sidebar user={user} />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl animate-fade-in-up">
              <div className="flex justify-end p-2">
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border p-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">MicroManus</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </ChatsProvider>
  );
}
