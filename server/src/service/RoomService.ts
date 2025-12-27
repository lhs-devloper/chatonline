import { db, isFirebaseInitialized } from '../config/firebase';
import { Room } from '../model/Room';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'rooms';

// In-memory storage for development without Firebase
const inMemoryRooms = new Map<string, Room>();

export class RoomService {

    // Create a new room
    static async createRoom(roomName: string, adminId: string, password?: string): Promise<Room> {
        const roomId = uuidv4();
        const newRoom: Room = {
            roomId,
            roomName,
            password, // In prod, hash this!
            adminId,
            users: [adminId],
            createdAt: new Date()
        };

        if (!isFirebaseInitialized) {
            console.log('📝 Using in-memory storage (Firebase not configured)');
            inMemoryRooms.set(roomId, newRoom);
            return newRoom;
        }

        try {
            await db.collection(COLLECTION_NAME).doc(roomId).set(newRoom);
            return newRoom;
        } catch (error) {
            console.error("Error creating room:", error);
            // Fallback to in-memory
            inMemoryRooms.set(roomId, newRoom);
            return newRoom;
        }
    }

    // Get all rooms (simplified)
    static async getRooms(): Promise<Room[]> {
        if (!isFirebaseInitialized) {
            console.log('📝 Using in-memory storage (Firebase not configured)');
            return Array.from(inMemoryRooms.values());
        }

        try {
            const snapshot = await db.collection(COLLECTION_NAME).get();
            return snapshot.docs.map((doc: any) => doc.data() as Room);
        } catch (error) {
            console.warn("Firebase error (getRooms), using in-memory storage:", error);
            return Array.from(inMemoryRooms.values());
        }
    }

    // Join room
    static async joinRoom(roomId: string, userId: string, password?: string): Promise<{ success: boolean, message?: string }> {
        if (!isFirebaseInitialized) {
            console.log('📝 Using in-memory storage (Firebase not configured)');
            const room = inMemoryRooms.get(roomId);
            if (!room) {
                return { success: false, message: "Room not found" };
            }

            // Check password if room is private
            if (room.password && room.password !== password) {
                return { success: false, message: "Invalid password" };
            }

            // Add user to room
            if (!room.users.includes(userId)) {
                room.users.push(userId);
                inMemoryRooms.set(roomId, room);
            }
            return { success: true };
        }

        try {
            const doc = await db.collection(COLLECTION_NAME).doc(roomId).get();
            if (!doc.exists) {
                return { success: false, message: "Room not found" };
            }
            const room = doc.data() as Room;

            // Check password if room is private
            if (room.password && room.password !== password) {
                return { success: false, message: "Invalid password" };
            }

            // Add user to room
            if (!room.users.includes(userId)) {
                await db.collection(COLLECTION_NAME).doc(roomId).update({
                    users: [...room.users, userId]
                });
            }
            return { success: true };

        } catch (error) {
            console.error("Error joining room:", error);
            // Fallback for dev
            return { success: true };
        }
    }
}

