import { db, isFirebaseInitialized } from '../config/firebase';
import { Chat } from '../model/Chat';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for development without Firebase
const inMemoryMessages = new Map<string, Chat[]>();

export class ChatService {

    static async saveMessage(roomId: string, userId: string, content: string, type: 'text' | 'image' | 'emoji'): Promise<Chat> {
        const chatId = uuidv4();
        const chat: Chat = {
            chatId,
            roomId,
            userId,
            content,
            type,
            timestamp: new Date()
        };

        if (!isFirebaseInitialized) {
            console.log('📝 Using in-memory storage for messages (Firebase not configured)');
            const roomMessages = inMemoryMessages.get(roomId) || [];
            roomMessages.push(chat);
            inMemoryMessages.set(roomId, roomMessages);
            return chat;
        }

        try {
            // Store in subcollection: rooms/{roomId}/messages/{chatId}
            await db.collection('rooms').doc(roomId).collection('messages').doc(chatId).set(chat);
        } catch (error) {
            console.warn("Firebase error (saveMessage), using in-memory storage:", error);
            const roomMessages = inMemoryMessages.get(roomId) || [];
            roomMessages.push(chat);
            inMemoryMessages.set(roomId, roomMessages);
        }
        return chat;
    }

    static async getMessages(roomId: string, limit: number = 50): Promise<Chat[]> {
        if (!isFirebaseInitialized) {
            console.log('📝 Using in-memory storage for messages (Firebase not configured)');
            const roomMessages = inMemoryMessages.get(roomId) || [];
            return roomMessages.slice(-limit); // Return last N messages
        }

        try {
            const snapshot = await db.collection('rooms').doc(roomId).collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate() // Convert Firestore Timestamp to Date
                } as Chat;
            }).reverse(); // Return in chronological order
        } catch (error) {
            console.warn("Firebase error (getMessages), using in-memory storage:", error);
            const roomMessages = inMemoryMessages.get(roomId) || [];
            return roomMessages.slice(-limit);
        }
    }
}

