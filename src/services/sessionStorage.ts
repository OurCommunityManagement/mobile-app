import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "../types/models";

const SESSION_KEY = "community_mobile_session";

export async function getStoredSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function setStoredSession(session: Session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
