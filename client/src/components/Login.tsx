import { useState } from 'react';

interface Props {
    onLogin: (username: string) => void;
}

export default function Login({ onLogin }: Props) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onLogin(input.trim());
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-pastel-bg p-4">
            <h1 className="text-3xl font-bold text-pastel-blue mb-8">Chat App</h1>
            <form onSubmit={handleSubmit} className="w-full max-w-xs">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter Username"
                    className="w-full p-3 rounded-lg border border-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-pastel-blue"
                />
                <button
                    type="submit"
                    className="w-full bg-pastel-blue text-white p-3 rounded-lg font-bold hover:bg-pastel-dark-blue transition"
                >
                    Start Chatting
                </button>
            </form>
        </div>
    );
}
