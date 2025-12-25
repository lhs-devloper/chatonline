import { db } from '../config/firebase';
import { Room } from '../model/Room';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'rooms';

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

        try {
            await db.collection(COLLECTION_NAME).doc(roomId).set(newRoom);
            return newRoom;
        } catch (error) {
            console.error("Error creating room:", error);
            // Fallback for dev without Firebase credentials
            return newRoom;
        }
    }

    // Get all rooms (simplified)
    static async getRooms(): Promise<Room[]> {
        try {
            const snapshot = await db.collection(COLLECTION_NAME).get();
            return snapshot.docs.map(doc => doc.data() as Room);
        } catch (error) {
            console.warn("Firebase error (getRooms), returning empty list:", error);
            return [];
        }
    }

    // Join room
    static async joinRoom(roomId: string, userId: string, password?: string): Promise<{ success: boolean, message?: string }> {
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
