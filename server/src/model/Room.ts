export interface Room {
    roomId: string;
    roomName: string;
    password?: string; // Optional for private rooms
    adminId?: string;
    users: string[]; // List of userIds
    createdAt: Date;
}
