import { Button, Input } from "@headlessui/react";
import { useState, useEffect, useRef } from "react";
import type { ChatMessage, PlayerInfo } from "../types";

interface ChatPanelProps {
    chat: ChatMessage[];
    playerInfo: PlayerInfo;
    onSendChat: (message: string) => void;
}

export default function ChatPanel({
    chat,
    playerInfo,
    onSendChat,
}: ChatPanelProps) {
    const [chatMessage, setChatMessage] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // autoscroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [chat]);

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatMessage.trim() && playerInfo.can_chat && playerInfo.is_alive) {
            onSendChat(chatMessage.trim());
            setChatMessage("");
        }
    };

    return (
        <div className="flex flex-col min-h-0 h-full p-4">
            <h3 className="flex-none font-bold mb-4">Chat</h3>
            <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 overflow-y-auto mb-4 border p-3 rounded bg-gray-50"
            >
                {chat.map((msg, index) => (
                    <div key={index} className="mb-1">
                        <span
                            className={
                                msg.is_server
                                    ? "font-semibold text-blue-600"
                                    : "font-semibold"
                            }
                        >
                            {msg.sender}:
                        </span>{" "}
                        {msg.message}
                    </div>
                ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex gap-2 flex-none">
                <Input
                    type="text"
                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                    placeholder={
                        !playerInfo.is_alive
                            ? "You are dead"
                            : playerInfo.can_chat
                              ? "Type a message..."
                              : "Cannot chat during this phase"
                    }
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={!playerInfo.can_chat || !playerInfo.is_alive}
                />
                <Button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={
                        !playerInfo.can_chat ||
                        !chatMessage.trim() ||
                        !playerInfo.is_alive
                    }
                >
                    Send
                </Button>
            </form>
        </div>
    );
}
