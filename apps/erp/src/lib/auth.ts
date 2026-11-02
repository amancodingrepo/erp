import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "./principal";
import { requireAuthSecret } from "./secrets";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: requireAuthSecret(),
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
        campusCode: { label: "Campus", type: "text" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");
        const portal = String(credentials?.portal ?? "staff");
        const campusCode = String(credentials?.campusCode ?? "");
        if (!username || !password) return null;
        try {
          const principal = await authenticateCredentials({
            username,
            password,
            portal,
            campusCode: campusCode || undefined,
          });
          return {
            id: principal.id,
            campusId: principal.campusId,
            actorType: principal.actorType,
            roles: principal.roles,
            permissions: principal.permissions,
            studentId: principal.studentId,
            guardianId: principal.guardianId,
            childIds: principal.childIds,
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
        token.studentId = user.studentId;
        token.guardianId = user.guardianId;
        token.childIds = user.childIds;
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
        studentId: token.studentId,
        guardianId: token.guardianId,
        childIds: token.childIds,
      };
      return session;
    },
  },
});
