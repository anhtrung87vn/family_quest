"use client";

import { useState } from "react";
import { ParentMessageMedia } from "@/components/ui/ParentMessageMedia";

interface Message {
  id: string;
  message: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
  reaction: string | null;
  reference_id: string | null;
  media_type: string | null;
  media_signed_url: string | null;
  audio_signed_url?: string | null;
}

interface MessagesSectionProps {
  messages: Message[];
  unreadCount: number;
  taskNameMap: Record<string, string>;
  title: string;
  markReadLabel: string;
  markReadAction: (formData: FormData) => Promise<void>;
  reactAction: (formData: FormData) => Promise<void>;
  unreadIds: string;
  clearAllAction?: () => Promise<void>;
}

function timeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

export function MessagesSection({ messages, unreadCount, taskNameMap, markReadAction, reactAction, unreadIds, title, markReadLabel, clearAllAction }: MessagesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm">
        {/* Header with collapse toggle */}
        <div className="flex w-full items-center justify-between px-4 pt-3 pb-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex flex-1 items-center gap-1.5 text-left"
          >
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-pink-700">
              💌 {title}
              {unreadCount > 0 && (
                <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
              )}
            </h2>
          </button>
          <div className="flex items-center gap-2">
            {clearAllAction && !collapsed && (
              confirmClear ? (
                <form action={clearAllAction} className="flex items-center gap-1">
                  <button type="submit" className="rounded-full bg-red-400 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-500">
                    Xóa hết ✓
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="text-[10px] text-stone-400 hover:text-stone-600">
                    Huỷ
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-400 hover:bg-red-50 hover:text-red-400"
                >
                  🗑 Xóa
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-pink-400 select-none px-1"
            >
              {collapsed ? "▶" : "▼"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="space-y-3 px-4 pb-4">
              {messages.slice(0, 4).map((msg) => {
                const taskName = msg.reference_id ? taskNameMap[msg.reference_id] : undefined;
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 ${msg.read_at ? "bg-white/60" : "bg-white shadow-sm ring-1 ring-pink-200"}`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-pink-600">❤️ Bố/Mẹ</span>
                      <span className="text-[10px] text-stone-400">{timeAgo(msg.created_at)}</span>
                      {msg.message_type === "QUEST_APPROVAL" && taskName && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          ✅ {taskName}
                        </span>
                      )}
                      {!msg.read_at && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-pink-500" />}
                    </div>
                    {msg.message.trim() && msg.message.trim() !== " " && (
                      <p className="text-sm text-stone-700 leading-relaxed">"{msg.message.trim()}"</p>
                    )}
                    {msg.media_type && msg.media_signed_url && (
                      <ParentMessageMedia
                        mediaType={msg.media_type as "photo" | "audio"}
                        signedUrl={msg.media_signed_url}
                        autoPlay={!msg.read_at && msg.media_type === "audio"}
                      />
                    )}
                    {/* Audio companion when message also has a photo — manual play only */}
                    {msg.audio_signed_url && (
                      <ParentMessageMedia
                        mediaType="audio"
                        signedUrl={msg.audio_signed_url}
                        autoPlay={false}
                      />
                    )}
                    {/* Reaction buttons */}
                    {!msg.reaction ? (
                      <div className="mt-2 flex gap-2">
                        {(["❤️", "😊", "🌟"] as const).map((emoji) => (
                          <form key={emoji} action={reactAction}>
                            <input type="hidden" name="id" value={msg.id} />
                            <input type="hidden" name="reaction" value={emoji} />
                            <button type="submit" className="rounded-full bg-stone-100 px-2.5 py-1 text-sm hover:bg-pink-100 transition-colors">
                              {emoji}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1.5 text-xs text-stone-400">Con đã phản hồi {msg.reaction}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <form action={markReadAction} className="border-t border-pink-100 px-4 py-2">
                <input type="hidden" name="ids" value={unreadIds} />
                <button type="submit" className="text-xs text-pink-400 hover:text-pink-600 transition-colors">
                  {markReadLabel} ✓
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
