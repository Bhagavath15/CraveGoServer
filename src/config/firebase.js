import admin from "firebase-admin";
import fs from "fs";

let firebaseApp = null;

if (!admin.getApps().length) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    try {
        if (serviceAccountPath) {
            const raw = fs.readFileSync(serviceAccountPath, "utf8");
            firebaseApp = admin.initializeApp({
                credential: admin.cert(JSON.parse(raw)),
            });
        } else if (projectId && privateKey && clientEmail) {
            firebaseApp = admin.initializeApp({
                credential: admin.cert({
                    projectId,
                    privateKey: privateKey.replace(/\\n/g, "\n"),
                    clientEmail,
                }),
            });
        } else {
            console.warn(
                "Firebase Admin: no credentials found. " +
                "Set FIREBASE_SERVICE_ACCOUNT_PATH or " +
                "FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL."
            );
        }
    } catch (err) {
        console.error("Firebase Admin: initialization failed:", err.message);
    }
} else {
    firebaseApp = admin.getApp();
}

export default firebaseApp;
