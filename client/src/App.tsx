import { useState, useEffect } from 'react';
import { socket } from './socket';
import Login from './components/Login';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';

function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('chat_username') || '');
  const [currentRoom, setCurrentRoom] = useState(() => localStorage.getItem('chat_currentRoom') || '');
  const [currentRoomName, setCurrentRoomName] = useState(() => localStorage.getItem('chat_currentRoomName') || '');

  const [view, setView] = useState<'login' | 'rooms' | 'chat'>(() => {
    const savedUser = localStorage.getItem('chat_username');
    const savedRoom = localStorage.getItem('chat_currentRoom');
    if (savedUser && savedRoom) return 'chat';
    if (savedUser) return 'rooms';
    return 'login';
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_currentRoom', currentRoom);
    localStorage.setItem('chat_currentRoomName', currentRoomName);
  }, [username, currentRoom, currentRoomName]);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const onConnect = () => {
      console.log('Socket connected:', socket.id);
      setConnectionStatus('connected');
      if (username) {
        // Send both username AND currentRoom to restore session correctly
        // Use currentRoom from state (which might be from localStorage)
        socket.emit('login', username, currentRoom);
      }
    };

    const onDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = (attemptNumber: number) => {
      console.log('Reconnection attempt:', attemptNumber);
      setConnectionStatus('reconnecting');
    };

    const onReconnectFailed = () => {
      console.log('Reconnection failed');
      setConnectionStatus('disconnected');
    };

    const onReconnect = (attemptNumber: number) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    };

    const onJoinRoomSuccess = ({ roomId, roomName }: { roomId: string, roomName: string }) => {
      setCurrentRoom(roomId);
      setCurrentRoomName(roomName);
      setView('chat');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('reconnect_failed', onReconnectFailed);
    socket.on('reconnect', onReconnect);
    socket.on('joinRoomSuccess', onJoinRoomSuccess);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('reconnect_failed', onReconnectFailed);
      socket.off('reconnect', onReconnect);
      socket.off('joinRoomSuccess', onJoinRoomSuccess);
    };
  }, [username]);

  const handleLogin = (user: string) => {
    setUsername(user);
    socket.emit('login', user);
    setView('rooms');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'reconnecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '연결됨';
      case 'reconnecting': return '재연결 중...';
      case 'disconnected': return '연결 끊김';
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom('');
    setCurrentRoomName('');
    setView('rooms');
  };

  return (
    <div className="app-container">
      {/* Connection Status Indicator */}
      {view !== 'login' && (
        <div className="fixed top-2 right-2 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-md z-50">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-xs font-medium text-gray-700">{getStatusText()}</span>
        </div>
      )}

      {view === 'login' && <Login onLogin={handleLogin} />}
      {view === 'rooms' && <RoomList username={username} />}
      {view === 'chat' && <ChatRoom roomId={currentRoom} roomName={currentRoomName} username={username} onLeave={handleLeaveRoom} />}
    </div>
  );
}

export default App;
