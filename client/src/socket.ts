import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false,
    // Reconnection settings
    reconnection: true,              // 자동 재연결 활성화
    reconnectionAttempts: Infinity,  // 무한 재연결 시도
    reconnectionDelay: 1000,         // 재연결 시도 간격 (1초)
    reconnectionDelayMax: 5000,      // 최대 재연결 간격 (5초)
    randomizationFactor: 0.5,        // 재연결 간격 랜덤화

    // Timeout settings
    timeout: 20000,                  // 연결 타임아웃 (20초)

    // Transport settings
    transports: ['websocket', 'polling'], // WebSocket 우선, 실패 시 polling
    upgrade: true,                   // polling에서 websocket으로 업그레이드 허용
});
