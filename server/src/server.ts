import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    maxHttpBufferSize: 50e6, // 50 MB
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
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

import { RoomService } from './service/RoomService';
import { ChatService } from './service/ChatService';

interface ChatSocket extends Socket {
    username?: string;
    currentRoomId?: string;
}

io.on("connection", (socket: Socket) => {
    const chatSocket = socket as ChatSocket;
    console.log("User connected:", socket.id);

    // 1. Join Global/Lobby or Login
    chatSocket.on("login", (username: string) => {
        chatSocket.username = username;
        connectedUsers.set(socket.id, { username });
        io.emit("userList", Array.from(connectedUsers.values()).map(u => u.username));
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
            }

            // Join new room
            socket.join(data.roomId);
            chatSocket.currentRoomId = data.roomId;

            // Update user state
            const user = connectedUsers.get(socket.id);
            if (user) user.currentRoomId = data.roomId;

            // Send success and history
            socket.emit("joinRoomSuccess", { roomId: data.roomId });
            const history = await ChatService.getMessages(data.roomId);
            socket.emit("chatHistory", history);

            // Notify room
            io.to(data.roomId).emit("systemMessage", `${chatSocket.username} joined the room.`);
        } else {
            socket.emit("joinRoomError", { message: result.message });
        }
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
            connectedUsers.delete(socket.id);
            io.emit("userList", Array.from(connectedUsers.values()).map(u => u.username));
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
