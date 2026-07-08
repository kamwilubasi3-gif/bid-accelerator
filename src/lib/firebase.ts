import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirebaseConfig } from "./firebase-config.functions";

let appPromise: Promise<{ app: FirebaseApp; auth: Auth }> | null = null;

export function getFirebase() {
  if (!appPromise) {
    appPromise = (async () => {
      const config = await getFirebaseConfig();
      const app = initializeApp(config);
      const auth = getAuth(app);
      return { app, auth };
    })();
  }
  return appPromise;
}
