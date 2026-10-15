import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const getPinKey = (userId) => {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  return `taskpilot_pin_${userId}`;
};

const isValidPin = (pin) => /^\d{4,6}$/.test(pin);

async function hashPin(pin, salt) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

export async function hasPin(userId) {
  const stored = await SecureStore.getItemAsync(
    getPinKey(userId)
  );

  return stored !== null;
}

export async function savePin(userId, pin) {
  if (!isValidPin(pin)) {
    throw new Error("PIN must contain 4 to 6 digits.");
  }

  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);

  await SecureStore.setItemAsync(
    getPinKey(userId),
    JSON.stringify({ salt, hash })
  );
}

export async function verifyPin(userId, enteredPin) {
  if (!isValidPin(enteredPin)) {
    return false;
  }

  const stored = await SecureStore.getItemAsync(
    getPinKey(userId)
  );

  if (!stored) {
    return false;
  }

  const { salt, hash } = JSON.parse(stored);
  const enteredHash = await hashPin(
    enteredPin,
    salt
  );

  return enteredHash === hash;
}

export async function removePin(userId) {
  await SecureStore.deleteItemAsync(
    getPinKey(userId)
  );
}


const getAppLockKey = (userId) => {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  return `taskpilot_app_lock_${userId}`;
};

export async function getAppLockEnabled(userId) {
  const pinExists = await hasPin(userId);

  if (!pinExists) {
    return false;
  }

  const stored = await SecureStore.getItemAsync(
    getAppLockKey(userId)
  );

  // Existing accounts with a PIN remain protected.
  return stored !== "false";
}

export async function setAppLockEnabled(userId, enabled) {
  if (typeof enabled !== "boolean") {
    throw new Error("App Lock setting must be a boolean.");
  }

  if (enabled && !(await hasPin(userId))) {
    throw new Error("Set up a PIN before enabling App Lock.");
  }

  await SecureStore.setItemAsync(
    getAppLockKey(userId),
    String(enabled)
  );
}
