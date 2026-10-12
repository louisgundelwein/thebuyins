import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "./db";

const env = process.env;

/** Web origins allowed to call the API with cookies (Expo web dev server + deployed web app). */
export const webOrigins = (env.WEB_ORIGINS ?? "http://localhost:8081").split(",");

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  plugins: [
    expo(),
    magicLink({
      // TODO: send via a mail provider (e.g. Resend). Logged for local dev.
      sendMagicLink: async ({ email, url }) => {
        console.log(`[magic-link] ${email}: ${url}`);
      },
    }),
  ],
  trustedOrigins: [
    "homegame://",
    ...webOrigins,
    ...(env.NODE_ENV === "production" ? [] : ["exp://**"]),
  ],
});
