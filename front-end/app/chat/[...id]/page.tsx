'use client'
import Image from "next/image";
import {useEffect, useState} from "react";
import {connect} from "@/lib/socket";
import {usePathname} from "next/navigation";

export default function Page() {
    const pathname = usePathname();

    const [chatId, setChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<{
        platform: string,
        icon: { broadcaster: string, moderator: string, subscriber: string },
        username: string,
        message: string
    }[]>([]);
    const [startedChat, setStartedChat] = useState<boolean>(false);

    useEffect(() => {
        setChatId(pathname.split('/')[2])
    }, [pathname]);

    useEffect(() => {
        const element = document.getElementById('chat-container');
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const requestChat = async () => {
            const response = await fetch(`https://tvytapi.raeveira.nl/api/retrieve-chat?chatId=${chatId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                console.error('Error fetching chat data:', response.statusText);
                return;
            }

            console.log('Chat response:', response);

            const data = await response.json();
            console.log('Chat data:', data);
            setStartedChat(true);
        }
        if (chatId !== null) {
            requestChat();
        }
    }, [chatId]);

    useEffect(() => {
        const element = document.getElementById('chat-container');
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const socket = connect();

        socket.emit('joinRoom', chatId);

        socket.on('chat', (newMessages) => {
            console.log('Received chat messages:', newMessages);
            setMessages((prev) => [...prev, ...newMessages].slice(-20));
        });

        return () => {
            socket.off('chat');
        };
    }, [startedChat, chatId]);

    return (
        <div
            id="chat-container"
            className="w-full h-screen overflow-y-auto scroll-smooth p-[10px] box-border bg-[rgba(0,0,0,0.5)] rounded-[15px] select-none pointer-events-none"
        >
            {messages.map((message, index) => (
                <div
                    key={index}
                    className="flex items-start mb-[5px] p-[8px_12px] animate-fadeIn text-xl"
                >
                    {/* Username and Message */}
                    <div className={'inline'}>
                        <div className="inline-flex items-center mr-[7.5px]">
                            {/* Platform Icon */}
                            <Image
                                width={30}
                                height={30}
                                src={
                                    message.platform.toLowerCase() === 'twitch'
                                        ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzkxNDZGRiIgZD0iTTIuMTQ5IDBMMSAzLjc3OHYxNi40NDZIOS4wNFYyNGg0LjEyN2wzLjg3LTMuNzc2aDUuOTg4bDUuOTg4LTUuOTY5VjBIMi4xNDl6bTE5Ljk2NCAxMy45NTJsLTMuODcgMy43NzZoLTUuOTg4bC0zLjg3IDMuNzc2di0zLjc3NkgzLjUwN1YyLjk4M2gxOC42MDZ2MTAuOTY5eiIvPjxwYXRoIGZpbGw9IiM5MTQ2RkYiIGQ9Ik0xMC4xMTkgOC45NTJWMTQuOTJoMi45ODNWOC45NTJoLTIuOTgzem04LjE3IDBWMTQuOTJoMi45ODNWOC45NTJoLTIuOTgzeiIvPjwvc3ZnPg=='
                                        : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0ZGMDAwMCIgZD0iTTIzLjQ5OCA2LjE4NmEzLjAxNiAzLjAxNiAwIDAgMC0yLjEyMi0yLjEzNkMxOS41MDUgMy41NDUgMTIgMy41NDUgMTIgMy41NDVzLTcuNTA1IDAtOS4zNzcuNTA1QTMuMDE3IDMuMDE3IDAgMCAwIC41MDIgNi4xODZDMCA4LjA3IDAgMTIgMCAxMnMwIDMuOTMuNTAyIDUuODE0YTMuMDE2IDMuMDE2IDAgMCAwIDIuMTIyIDIuMTM2YzEuODcxLjUwNSA5LjM3Ni41MDUgOS4zNzYuNTA1czYuNTA1IDAgOS4zNzctLjUwNWEzLjAxNSAzLjAxNSAwIDAgMCAyLjEyMi0yLjEzNkMyNCAxNS45MyAyNCAxMiAyNCAxMnMwLTMuOTMtLjUwMi01LjgxNHpNOS41NDUgMTUuNTY4VjguNDMyTDE1LjgxOCAxMmwtNi4yNzMgMy41Njh6Ii8+PC9zdmc+'
                                }
                                alt={`${message.platform} icon`}
                                className="mr-[8px] flex-shrink-0"
                            />
                            {/* Badges */}
                            {message.icon?.broadcaster && (
                                <Image
                                    width={30}
                                    height={30}
                                    src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1"
                                    alt="Broadcaster Badge"
                                    className="mr-[8px] flex-shrink-0"
                                />
                            )}
                            {message.icon?.moderator && (
                                <Image
                                    width={30}
                                    height={30}
                                    src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1"
                                    alt="Moderator Badge"
                                    className="mr-[8px] flex-shrink-0"
                                />
                            )}
                            {message.icon?.subscriber && (
                                <Image
                                    width={30}
                                    height={30}
                                    src="https://static-cdn.jtvnw.net/badges/v1/9a1d2dd4-d90c-49f2-b2db-b2448d2e1b01/1"
                                    alt="Subscriber Badge"
                                    className="mr-[8px] flex-shrink-0"
                                />
                            )}
                            <span className="font-bold text-[#dddddd] text-[2rem]">{message.username}: </span>
                        </div>
                        <span
                            className="text-[#ffffff] break-words [word-wrap:break-word] relative -tracking-[0.05em] text-[2rem] -top-[4px] no-scrollbar">{message.message}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}