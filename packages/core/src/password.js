import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
export function hashPassword(password) {
    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }
    const salt = randomBytes(16);
    const derived = scryptSync(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}
export function verifyPassword(password, stored) {
    if (!stored)
        return false;
    const [algorithm, saltHex, hashHex] = stored.split("$");
    if (algorithm !== "scrypt" || !saltHex || !hashHex)
        return false;
    try {
        const salt = Buffer.from(saltHex, "hex");
        const expected = Buffer.from(hashHex, "hex");
        const derived = scryptSync(password, salt, expected.length);
        return expected.length === derived.length && timingSafeEqual(expected, derived);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=password.js.map