import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Linkify from 'linkify-react';
import { socket } from '../socket';
import EmoticonPicker from './EmoticonPicker';

interface Message {
    userId: string;
    content?: string;
    image?: string;
    timestamp: string | Date;
    type?: 'text' | 'image' | 'video' | 'emoji' | 'emoticon';
}

interface Props {
    roomId: string;
    roomName: string;
    username: string;
    onLeave: () => void;
}

const linkifyOptions = {
    target: '_blank',
    className: 'text-pastel-blue underline hover:text-blue-600 transition-colors',
    validate: {
        url: (value: string) => /^(http|https):\/\//.test(value)
    },
    onClick: (e: any, href: string) => {
        if (!window.confirm(`${href} (으)로 이동하시겠습니까?`)) {
            e.preventDefault();
        }
    }
};

const getUserColor = (userId: string) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function ChatRoom({ roomId, roomName, username, onLeave }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [roomUsers, setRoomUsers] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showUserList, setShowUserList] = useState(false);
    const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        socket.on('chat message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('chatHistory', (history: Message[]) => {
            setMessages(history);
        });

        socket.on('roomUserList', (users: string[]) => {
            setRoomUsers(users);
        });

        socket.on('systemMessage', (content: string) => {
            setMessages(prev => [...prev, { userId: 'System', content, timestamp: new Date() }]);
        });

        return () => {
            socket.off('chat message');
            socket.off('chatHistory');
            socket.off('roomUserList');
            socket.off('systemMessage');
        };
    }, []);

    useEffect(() => {
        if (!showScrollButton) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showScrollButton]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isAtBottom);
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            let content = input;
            if (replyTo) {
                content = `(Replying to ${replyTo.userId}: "${replyTo.content?.substring(0, 20)}...")\n${input}`;
            }
            socket.emit('chat message', { message: content, type: 'text' });
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

    const handleMediaClick = (url: string, type: 'image' | 'video') => {
        setSelectedMedia({ url, type });
        setIsZoomed(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollButton(false);
    };

    const sendEmoticon = (url: string) => {
        socket.emit('chat message', { message: url, type: 'emoticon' });
    };

    return (
        <div className="flex flex-col h-full bg-pastel-bg relative overflow-hidden font-sans">
            <header className="p-4 bg-white shadow-sm flex justify-between items-center z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => {
                        socket.emit('leaveRoom', { roomId });
                        onLeave();
                    }} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-pastel-blue">
                        ←
                    </button>
                    <div>
                        <h2 className="font-bold text-gray-800">{roomName}</h2>
                    </div>
                </div>
                <button
                    onClick={() => setShowUserList(!showUserList)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                    👥
                    <span className="absolute -top-1 -right-1 bg-pastel-blue text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {roomUsers.length}
                    </span>
                </button>
            </header>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
                {messages.map((msg, idx) => {
                    const isSystem = msg.userId === 'System';
                    const isMe = msg.userId === username;
                    const isImage = msg.type === 'image' || (msg.content && msg.content.startsWith('data:image'));
                    const isEmoticon = msg.type === 'emoticon';

                    if (isSystem) {
                        return (
                            <div key={idx} className="flex justify-center my-2">
                                <span className="text-[10px] bg-gray-200/50 text-gray-500 px-3 py-1 rounded-full font-medium">
                                    {msg.content}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={idx}
                            onClick={() => !isEmoticon && setReplyTo(msg)}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className="flex flex-col max-w-[70%]">
                                {!isMe && (
                                    <div className="text-[11px] mb-1 font-bold ml-1 transition-colors" style={{ color: getUserColor(msg.userId) }}>
                                        {msg.userId}
                                    </div>
                                )}
                                <div className={`${isEmoticon ? '' : 'rounded-2xl p-3 shadow-sm'} break-words transition-all hover:brightness-95 ${isEmoticon ? 'bg-transparent' : (isMe ? 'bg-pastel-chat-me text-black rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none')
                                    }`}>
                                    {isEmoticon ? (
                                        <img
                                            src={msg.content}
                                            alt="Emoticon"
                                            className="w-[180px] h-[180px] object-contain animate-in zoom-in-50 duration-300"
                                        />
                                    ) : isImage ? (
                                        <img
                                            src={msg.content}
                                            alt="Shared"
                                            className="rounded-lg max-w-full h-auto cursor-zoom-in active:scale-95 transition-transform"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMediaClick(msg.content!, 'image');
                                            }}
                                        />
                                    ) : (
                                        <div className="whitespace-pre-wrap leading-relaxed text-[14px]">
                                            <Linkify options={linkifyOptions}>{msg.content}</Linkify>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
                {showScrollButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 right-6 bg-white shadow-xl rounded-full p-3 z-30 border border-gray-100"
                    >
                        ↓
                    </motion.button>
                )}
            </AnimatePresence>

            {/* User List Sidebar */}
            <AnimatePresence>
                {showUserList && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowUserList(false)}
                            className="absolute inset-0 bg-black/20 z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute right-0 top-0 bottom-0 w-64 bg-white z-50 shadow-2xl p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800">참여자 목록</h3>
                                <button onClick={() => setShowUserList(false)}>✕</button>
                            </div>
                            <div className="space-y-4">
                                {roomUsers.map(user => (
                                    <div key={user} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: getUserColor(user) }}>
                                            {user[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{user}</span>
                                        {user === username && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">나</span>}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Media Modal */}
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setSelectedMedia(null)}
                    >
                        <motion.div
                            layout
                            className={`relative ${isZoomed ? 'w-full h-full' : 'max-w-[90%] max-h-[90%]'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsZoomed(!isZoomed);
                            }}
                        >
                            {selectedMedia.type === 'image' ? (
                                <img
                                    src={selectedMedia.url}
                                    alt="Enlarged"
                                    className={`rounded-lg cursor-zoom-${isZoomed ? 'out' : 'in'} transition-all duration-300 ${isZoomed ? 'w-full h-full object-contain' : 'max-w-full max-h-full object-contain'}`}
                                />
                            ) : (
                                <video
                                    src={selectedMedia.url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-full rounded-lg"
                                />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Emoticon Picker */}
            <AnimatePresence>
                {showEmoticonPicker && (
                    <EmoticonPicker
                        onSelect={sendEmoticon}
                        onClose={() => setShowEmoticonPicker(false)}
                    />
                )}
            </AnimatePresence>

            <div className="bg-white border-t">
                {replyTo && (
                    <div className="p-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center border-b">
                        <span className="truncate flex-1">답장 중: {replyTo.userId}: "{replyTo.content}"</span>
                        <button onClick={() => setReplyTo(null)} className="ml-2 p-1 hover:bg-gray-200 rounded">✕</button>
                    </div>
                )}
                <form onSubmit={sendMessage} className="p-3 flex gap-2 items-end">
                    <button
                        type="button"
                        onClick={() => setShowEmoticonPicker(!showEmoticonPicker)}
                        className={`text-xl p-2 rounded-full transition-all hover:bg-gray-100 active:scale-90 mb-1 ${showEmoticonPicker ? 'bg-pastel-blue/10 scale-110' : ''}`}
                        title="이모티콘"
                    >
                        😀
                    </button>
                    <label className="cursor-pointer text-gray-400 hover:text-pastel-blue p-2 transition-colors mb-1">
                        📷
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <div className="flex-1 bg-gray-100 rounded-2xl focus-within:ring-2 focus-within:ring-pastel-blue/30 transition-all px-4 py-2">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage(e);
                                } else if (e.key === 'Escape') {
                                    setShowEmoticonPicker(false);
                                }
                            }}
                            placeholder="메시지를 입력하세요..."
                            rows={1}
                            className="w-full bg-transparent focus:outline-none resize-none py-1 text-[14px] leading-relaxed max-h-32 overflow-y-auto block"
                            style={{ height: 'auto' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="text-pastel-blue font-bold px-4 py-2 hover:bg-pastel-blue/5 rounded-full transition-colors active:scale-95 disabled:opacity-50 mb-1"
                        disabled={!input.trim()}
                    >
                        전송
                    </button>
                </form>
            </div>
        </div>
    );
}
