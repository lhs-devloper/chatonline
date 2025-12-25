import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

interface Message {
    userId: string;
    content?: string;
    image?: string;
    timestamp: string | Date;
    type?: 'text' | 'image' | 'emoji';
}

interface Props {
    roomId: string;
    username: string;
    onLeave: () => void;
}

export default function ChatRoom({ username, onLeave }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        socket.on('chat message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('chatHistory', (history: Message[]) => {
            setMessages(history);
        });

        return () => {
            socket.off('chat message');
            socket.off('chatHistory');
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            const msgData: any = { message: input, type: 'text' };
            if (replyTo) {
                msgData.message = `(Replying to ${replyTo.userId}: "${replyTo.content}")\n${input}`;
            }
            socket.emit('chat message', msgData);
            setInput('');
            setReplyTo(null);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                socket.emit('chatImage', { image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-pastel-bg">
            <header className="p-4 bg-white shadow-sm flex justify-between items-center z-10">
                <button onClick={onLeave} className="text-pastel-blue font-bold">← Back</button>
                <h2 className="font-bold text-gray-700">Chat Room</h2>
                <div className="w-8"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                    const isMe = msg.userId === username;
                    return (
                        <div key={idx}
                            onClick={() => setReplyTo(msg)}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} cursor-pointer`}>
                            <div className={`max-w-[70%] rounded-2xl p-3 ${isMe ? 'bg-pastel-chat-me text-black rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                                }`}>
                                {!isMe && <div className="text-xs opacity-50 mb-1">{msg.userId}</div>}
                                {msg.type === 'image' ? (
                                    <img src={msg.content} alt="Shared" className="rounded-lg max-w-full" />
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t">
                {replyTo && (
                    <div className="p-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center border-b">
                        <span>Replying to {replyTo.userId}...</span>
                        <button onClick={() => setReplyTo(null)}>✕</button>
                    </div>
                )}
                <form onSubmit={sendMessage} className="p-3 flex gap-2 items-center">
                    <label className="cursor-pointer text-gray-400 hover:text-pastel-blue p-2">
                        📷
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-pastel-blue px-4"
                    />
                    <button type="submit" className="text-pastel-blue font-bold p-2">Send</button>
                </form>
            </div>
        </div>
    );
}
