import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({
    path: path.resolve(process.cwd(), '../.env'),
});

let firebaseInitialized = false;

// Firebase 초기화 시도
if (!admin.apps.length) {
    try {
        // 방법 1: 환경 변수에서 서비스 계정 파일 경로 사용
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(path.resolve(serviceAccountPath));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
            console.log('✅ Firebase Admin initialized with service account file');
            firebaseInitialized = true;
        }
        // 방법 2: 환경 변수에서 직접 credential 정보 사용
        else if (process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
            console.log('✅ Firebase Admin initialized with environment variables');
            firebaseInitialized = true;
        }
        // 방법 3: 기본 경로에서 서비스 계정 파일 찾기
        else {
            const defaultPaths = [
                path.join(__dirname, '../../web-chat-67052-firebase-adminsdk-fbsvc-e53ce894b1.json'),
                path.join(process.cwd(), 'web-chat-67052-firebase-adminsdk-fbsvc-e53ce894b1.json'),
            ];

            for (const filePath of defaultPaths) {
                if (fs.existsSync(filePath)) {
                    const serviceAccount = require(filePath);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
			databaseURL: process.env.FIREBASE_DATABASE_URL
                    });
                    console.log(`✅ Firebase Admin initialized with file: ${filePath}`);
                    firebaseInitialized = true;
                    break;
                }
            }
        }

        if (!firebaseInitialized) {
            console.warn('⚠️  Firebase credentials not found. Running without Firebase.');
            console.warn('   Set FIREBASE_SERVICE_ACCOUNT_PATH or provide credentials in .env');
        }
    } catch (error) {
        console.error('❌ Firebase Admin Initialization Error:', error);
        console.warn('⚠️  Continuing without Firebase. Some features may not work.');
    }
}

// Firebase가 초기화되지 않은 경우를 위한 안전한 export
export const db = firebaseInitialized ? admin.firestore() : null as any;
export const rtdb = firebaseInitialized ? admin.database() : null as any;
export const messaging = firebaseInitialized ? admin.messaging() : null as any;
export const isFirebaseInitialized = firebaseInitialized;


