export interface Chat {
    chatId: string;
    userId: string;
    roomId: string;
    content: string;
    type: 'text' | 'image' | 'emoji';
    timestamp: Date;
}
