import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "./principal";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");
        const portal = String(credentials?.portal ?? "staff");
        if (!username || !password) return null;
        try {
          const principal = await authenticateCredentials({
            username,
            password,
            portal,
          });
          return {
            id: principal.id,
            campusId: principal.campusId,
            actorType: principal.actorType,
            roles: principal.roles,
            permissions: principal.permissions,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.campusId = user.campusId;
        token.actorType = user.actorType;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId,
        campusId: token.campusId,
        actorType: token.actorType,
        roles: token.roles,
        permissions: token.permissions,
      };
      return session;
    },
  },
});
