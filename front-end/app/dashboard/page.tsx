'use client';

import {useEffect, useState} from "react";
import {connect} from "@/lib/socket";

const safeJsonParse = (str: string) => {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return null;
    }
};

export default function Page() {
    const [log, setLog] = useState<{ message: string, code: number }[]>([]);
    const [chatId, setChatId] = useState<string>();

    useEffect(() => {
        fetch('https://tvytapi.raeveira.nl/api/auth/retrieve-chatId')
            .then(response => response.json())
            .then(data => {
                console.log('ChatId:', data);
                setChatId(data.chatId);
            })
            .catch(error => {
                console.error('Failed to retrieve chatId:', error);
            });
    }, []);

    useEffect(() => {
        const socket = connect();

        socket.on('error', (error) => {
            if (error.message) {
                const parsedErrorMessage = safeJsonParse(error.message);
                if (parsedErrorMessage) {
                    setLog(prevLog => [...prevLog, parsedErrorMessage]);
                } else {
                    setLog(prevLog => [...prevLog, {message: error.message, code: error.code || 500}]);
                }
            }
        });

        socket.on('success', (message) => {
            if (message.message) {
                const parsedMessage = safeJsonParse(message.message);
                if (parsedMessage) {
                    setLog(prevLog => [...prevLog, parsedMessage]);
                } else {
                    setLog(prevLog => [...prevLog, {message: message.message, code: 200}]);
                }
            }
        });

        return () => {
            socket.off('error');
            socket.off('success')
        };
    }, []);

    return (
        <div className={'flex flex-row items-center justify-center h-screen w-screen'}>
            <div className="text-[2rem] font-bold text-center flex-1">
                <div>
                    Auth:
                    <a href={'https://tvytapi.raeveira.nl/api/auth/twitch'}
                       className={'text-blue-500 hover:underline'}>
                        Twitch
                    </a>
                    <a href={'https://tvytapi.raeveira.nl/api/auth/youtube'}
                       className={'text-red-500 hover:underline'}>
                        YouTube
                    </a>
                </div>
            </div>
            <div className={'flex-1 flex justify-end items-center h-full relative'}>
                <div
                    className={'w-[600px] h-[400px] bg-[rgba(0,0,0,0.5)] rounded-[15px] absolute right-0 top-0 m-5 p-2 overflow-y-auto'}>
                    {log?.map((message, index) => (
                        <div key={index}
                             className={`mb-2 shadow-md p-2 bg-white rounded-xl ${message.code === 200 ? 'text-green-500' : 'text-red-500'}`}>
                            {message.message || JSON.stringify(message)}
                        </div>
                    ))}
                </div>
                {chatId &&
                    <embed src={`/chat/${chatId}`} className={'w-[600px] h-[400px] absolute right-0 bottom-0 m-5'}/>
                }
            </div>

        </div>
    );
};
