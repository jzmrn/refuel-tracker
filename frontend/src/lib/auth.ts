import { IncomingMessage } from "http";
import type { User } from "./auth/UserContext";

export type { User };

/**
 * Extracts user information from Envoy-forwarded JWT headers
 */
export function getUserFromHeaders(req: IncomingMessage): User | null {
  try {
    const sub_header = req.headers["x-jwt-sub"];
    const name_header = req.headers["x-jwt-name"];
    const email_header = req.headers["x-jwt-email"];
    const picture_header = req.headers["x-jwt-picture"];

    const id = Array.isArray(sub_header) ? sub_header[0] : sub_header;
    const name = Array.isArray(name_header) ? name_header[0] : name_header;
    const email = Array.isArray(email_header) ? email_header[0] : email_header;
    const picture = Array.isArray(picture_header)
      ? picture_header[0]
      : picture_header;

    if (id && email) {
      const user: User = {
        id,
        email,
        name: name || email,
        picture: picture,
      };

      console.log("User extracted from headers:", user);
      return user;
    }

    console.log("No user found in headers");
    return null;
  } catch (error) {
    console.error("Failed to extract user from headers:", error);
    return null;
  }
}
