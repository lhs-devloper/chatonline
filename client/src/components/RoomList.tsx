import { useState, useEffect } from 'react';
import { socket } from '../socket';

interface Room {
    roomId: string;
    roomName: string;
    password?: string;
}

interface Props {
    username: string;
}

export default function RoomList({ username }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        socket.emit('getRooms');

        socket.on('roomList', (list: Room[]) => {
            setRooms(list);
        });

        socket.on('roomCreated', (room: Room) => {
            setRooms(prev => [...prev, room]);
        });

        // Handle join room error (e.g., wrong password)
        socket.on('joinRoomError', (data: { message: string }) => {
            if (data.message === 'Invalid password') {
                alert('비밀번호가 틀렸습니다.');
            } else {
                alert(data.message);
            }
        });

        return () => {
            socket.off('roomList');
            socket.off('roomCreated');
            socket.off('joinRoomError');
        };
    }, []);

    const createRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRoomName.trim()) {
            socket.emit('createRoom', { name: newRoomName, password: newRoomPassword });
            setNewRoomName('');
            setNewRoomPassword('');
            setShowCreate(false);
        }
    };

    const joinRoom = (room: Room) => {
        let password = '';
        if (room.password) {
            password = prompt('방 비밀번호를 입력하세요:') || '';
            if (!password) return;
        }
        socket.emit('joinRoom', { roomId: room.roomId, password });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 bg-pastel-blue text-black flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold">Rooms</h2>
                <span className="text-sm opacity-80">{username}</span>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {rooms.map(room => (
                    <div key={room.roomId}
                        onClick={() => joinRoom(room)}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50 transition flex justify-between items-center">
                        <span className="font-medium text-gray-700">{room.roomName}</span>
                        {room.password && <span className="text-xs text-gray-400">🔒 Private</span>}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t">
                {showCreate ? (
                    <form onSubmit={createRoom} className="space-y-2">
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            placeholder="방 이름"
                            className="w-full p-2 border rounded"
                        />
                        <input
                            type="password"
                            value={newRoomPassword}
                            onChange={e => setNewRoomPassword(e.target.value)}
                            placeholder="비밀번호 (선택사항)"
                            className="w-full p-2 border rounded"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-pastel-blue text-black p-2 rounded">생성</button>
                            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-200 p-2 rounded">취소</button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setShowCreate(true)} className="w-full bg-pastel-blue text-black p-3 rounded-xl font-bold shadow-lg">
                        + 새 방 만들기
                    </button>
                )}
            </div>
        </div>
    );
}
