import { createServerFn } from "@tanstack/react-start";

export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY ?? "",
    authDomain: "outter-space.firebaseapp.com",
    databaseURL: "https://outter-space-default-rtdb.firebaseio.com",
    projectId: "outter-space",
    storageBucket: "outter-space.firebasestorage.app",
    messagingSenderId: "184903125298",
    appId: "1:184903125298:web:32b4e969bf8e4511272f2b",
  };
});
