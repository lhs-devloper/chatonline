import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config({
    path: path.resolve(process.cwd(), '../.env'),
});

const app = express();
const httpServer = createServer(app);

// CORS configuration based on environment
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
console.log(allowedOrigins);
console.log(process.env.NODE_ENV)
const io = new Server(httpServer, {
    maxHttpBufferSize: 50e6, // 50 MB
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    // Ping/Pong settings (heartbeat) - 서버 측
    pingTimeout: 60000,      // 60초 - 클라이언트 응답 대기 시간
    pingInterval: 25000,     // 25초 - 서버가 ping을 보내는 간격
    // Connection settings
    connectTimeout: 45000,   // 45초 - 연결 타임아웃
    upgradeTimeout: 10000,   // 10초 - transport 업그레이드 타임아웃
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Serve static files from the 'public' directory (relative to built file or source)
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.get("/", (req, res) => {
    res.send("Chat Server is running");
});

// In-memory user mapping: socketId -> User
const connectedUsers = new Map<string, { username: string, currentRoomId?: string }>();
// Persistence for user state by username (persists across reconnections)
const userStates = new Map<string, { currentRoomId?: string }>();

import { RoomService } from './service/RoomService';
import { ChatService } from './service/ChatService';

interface ChatSocket extends Socket {
    username?: string;
    currentRoomId?: string;
}

io.on("connection", (socket: Socket) => {
    const chatSocket = socket as ChatSocket;

    // Helper to broadcast room member list
    const broadcastRoomUsers = (roomId: string) => {
        const roomUsers = Array.from(connectedUsers.values())
            .filter(u => u.currentRoomId === roomId)
            .map(u => u.username);

        // Deduplicate in case same user has multiple sockets
        const uniqueRoomUsers = Array.from(new Set(roomUsers));
        io.to(roomId).emit("roomUserList", uniqueRoomUsers);
    };

    // 1. Join Global/Lobby or Login
    chatSocket.on("login", async (username: string, roomId?: string) => {
        chatSocket.username = username;

        // Restore state: 1. From client (Restoration) 2. From persistent memory
        const restoredRoomId = roomId || userStates.get(username)?.currentRoomId;

        if (restoredRoomId) {
            chatSocket.currentRoomId = restoredRoomId;
            socket.join(restoredRoomId);
            userStates.set(username, { currentRoomId: restoredRoomId });

            // Restore chat room UI state and history
            const room = await RoomService.getRoom(restoredRoomId);
            if (room) {
                socket.emit("joinRoomSuccess", { roomId: restoredRoomId, roomName: room.roomName });
                const history = await ChatService.getMessages(restoredRoomId);
                socket.emit("chatHistory", history);
            }
        }

        connectedUsers.set(socket.id, {
            username,
            currentRoomId: chatSocket.currentRoomId
        });

        io.emit("userList", Array.from(new Set(Array.from(connectedUsers.values()).map(u => u.username))));

        if (chatSocket.currentRoomId) {
            broadcastRoomUsers(chatSocket.currentRoomId);
        }
    });

    // 2. Get Rooms
    chatSocket.on("getRooms", async () => {
        const rooms = await RoomService.getRooms();
        socket.emit("roomList", rooms);
    });

    // 3. Create Room
    chatSocket.on("createRoom", async (data: { name: string, password?: string }) => {
        if (!chatSocket.username) return;
        const newRoom = await RoomService.createRoom(data.name, chatSocket.username, data.password);
        io.emit("roomCreated", newRoom); // Notify all
    });

    // 4. Join Room
    chatSocket.on("joinRoom", async (data: { roomId: string, password?: string }) => {
        if (!chatSocket.username) return;

        const result = await RoomService.joinRoom(data.roomId, chatSocket.username, data.password);
        if (result.success) {
            // Leave previous room
            if (chatSocket.currentRoomId) {
                socket.leave(chatSocket.currentRoomId);
                const oldRoomId = chatSocket.currentRoomId;
                // No need to broadcast here yet, we'll do it after updating state
            }

            // Join new room
            socket.join(data.roomId);
            chatSocket.currentRoomId = data.roomId;

            // Update persistent state and current session state
            userStates.set(chatSocket.username, { currentRoomId: data.roomId });
            connectedUsers.set(socket.id, { username: chatSocket.username, currentRoomId: data.roomId });

            // Send success and history
            socket.emit("joinRoomSuccess", { roomId: data.roomId, roomName: result.roomName });
            const history = await ChatService.getMessages(data.roomId);
            socket.emit("chatHistory", history);

            // Notify room
            io.to(data.roomId).emit("systemMessage", `${chatSocket.username}님이 입장하셨습니다.`);

            broadcastRoomUsers(data.roomId);
        } else {
            socket.emit("joinRoomError", { message: result.message });
        }
    });

    // 4.5 Leave Room
    chatSocket.on("leaveRoom", (data: { roomId: string }) => {
        socket.leave(data.roomId);
        chatSocket.currentRoomId = undefined;

        if (chatSocket.username) {
            userStates.set(chatSocket.username, { currentRoomId: undefined });
            connectedUsers.set(socket.id, { username: chatSocket.username, currentRoomId: undefined });
        }

        // Notify room
        io.to(data.roomId).emit("systemMessage", `${chatSocket.username}님이 퇴장하셨습니다.`);
        broadcastRoomUsers(data.roomId);
    });

    // 5. Send Message
    chatSocket.on("chat message", async (data: { message: string, type?: 'text' | 'image' | 'emoji' }) => {
        if (!chatSocket.username || !chatSocket.currentRoomId) return;

        const type = data.type || 'text';
        const savedChat = await ChatService.saveMessage(chatSocket.currentRoomId, chatSocket.username, data.message, type);

        io.to(chatSocket.currentRoomId).emit("chat message", savedChat);
    });

    // 6. Send Image
    chatSocket.on("chatImage", async (data: { image: string }) => {
        if (!chatSocket.username || !chatSocket.currentRoomId) return;

        const savedChat = await ChatService.saveMessage(chatSocket.currentRoomId, chatSocket.username, data.image, 'image');

        io.to(chatSocket.currentRoomId).emit("chat message", savedChat);
    });

    socket.on("disconnect", () => {
        if (chatSocket.username) {
            const roomId = chatSocket.currentRoomId;
            connectedUsers.delete(socket.id);

            io.emit("userList", Array.from(new Set(Array.from(connectedUsers.values()).map(u => u.username))));

            if (roomId) {
                broadcastRoomUsers(roomId);
                io.to(roomId).emit("systemMessage", `${chatSocket.username}님의 연결이 끊어졌습니다.`);
            }
        }
    });
});

app.get("/getUserList", (req, res) => {
    res.json(Array.from(connectedUsers.values()));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

