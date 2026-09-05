import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    campusId: string;
    actorType: string;
    roles: string[];
    permissions: string[];
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      campusId: string;
      actorType: string;
      roles: string[];
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    campusId: string;
    actorType: string;
    roles: string[];
    permissions: string[];
  }
}
