"use client";

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { Markdown } from "@/components/ui/markdown";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../../_types";

interface ChatListProps {
  messages: ChatMessage[];
}

export default function ChatList({ messages }: ChatListProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="space-y-4 p-4 pb-32">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

            return (
              <Message
                key={message.id}
                className={
                  message.role === "user" ? "justify-end" : "justify-start"
                }
              >
                {isAssistant && (
                  <MessageAvatar
                    src="/avatars/ai.png"
                    alt="AI Assistant"
                    fallback="AI"
                  />
                )}
                <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                  {isAssistant ? (
                    <div className="bg-secondary text-foreground prose rounded-lg p-2">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  ) : (
                    <MessageContent className="bg-primary text-primary-foreground">
                      {message.content}
                    </MessageContent>
                  )}
                </div>
              </Message>
            );
          })}
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  );
}
