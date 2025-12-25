import { db } from '../config/firebase';
import { Chat } from '../model/Chat';
import { v4 as uuidv4 } from 'uuid';

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

        try {
            // Store in subcollection: rooms/{roomId}/messages/{chatId}
            await db.collection('rooms').doc(roomId).collection('messages').doc(chatId).set(chat);
        } catch (error) {
            console.warn("Firebase error (saveMessage):", error);
        }
        return chat;
    }

    static async getMessages(roomId: string, limit: number = 50): Promise<Chat[]> {
        try {
            const snapshot = await db.collection('rooms').doc(roomId).collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp.toDate() // Convert Firestore Timestamp to Date
                } as Chat;
            }).reverse(); // Return in chronological order
        } catch (error) {
            console.warn("Firebase error (getMessages):", error);
            return [];
        }
    }
}
