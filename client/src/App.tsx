import { useState, useEffect } from 'react';
import { socket } from './socket';
import Login from './components/Login';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';

function App() {
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [view, setView] = useState<'login' | 'rooms' | 'chat'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    socket.connect();

    // Connection monitoring
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect_failed', () => {
      console.log('Reconnection failed');
      setConnectionStatus('disconnected');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    });

    socket.on('joinRoomSuccess', ({ roomId }: { roomId: string }) => {
      setCurrentRoom(roomId);
      setView('chat');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect_failed');
      socket.off('reconnect');
      socket.off('joinRoomSuccess');
      socket.disconnect();
    };
  }, []);

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
      {view === 'chat' && <ChatRoom roomId={currentRoom} username={username} onLeave={() => setView('rooms')} />}
    </div>
  );
}

export default App;
