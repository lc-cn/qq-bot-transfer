import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { getDb } from "@/lib/db";
import { users } from "@drizzle/schema";

type GitHubProfile = {
  id?: number | string;
  login?: string;
  name?: string | null;
  email?: string | null;
  image?: string;
};

async function upsertUserFromGitHub(profile: GitHubProfile) {
  if (profile.id == null) return null;
  const githubId = String(profile.id);
  const image =
    typeof profile.image === "string" ? profile.image : null;
  const db = await getDb();

  const [user] = await db
    .insert(users)
    .values({
      githubId,
      email: profile.email ?? null,
      name: profile.name ?? profile.login ?? null,
      image,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        email: profile.email ?? null,
        name: profile.name ?? profile.login ?? null,
        image,
      },
    })
    .returning();

  return user ?? null;
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  basePath: "/api/auth",
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl.replace(/\/$/, "")}${url}`;
      }
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (
          target.hostname === "localhost" ||
          target.hostname === "127.0.0.1" ||
          target.host !== base.host
        ) {
          return `${base.origin}${target.pathname}${target.search}${target.hash}`;
        }
        return url;
      } catch {
        return baseUrl;
      }
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && profile) {
        const user = await upsertUserFromGitHub(profile as GitHubProfile);
        if (user) token.dbUserId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.dbUserId) {
        session.user.id = token.dbUserId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
