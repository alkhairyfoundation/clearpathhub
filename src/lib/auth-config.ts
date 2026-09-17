import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { query as neonQuery } from "@/lib/neon";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Supabase",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const rows = await neonQuery(
            'SELECT * FROM profiles WHERE email = $1 LIMIT 1',
            [credentials.email]
          );
          const profile = rows[0] || null;

          if (!profile || !profile.password_hash) {
            console.error("Auth error: Invalid credentials");
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, profile.password_hash);
          if (!isValid) {
            console.error("Auth error: Invalid credentials");
            return null;
          }

          return {
            id: profile.id,
            email: profile.email,
            role: profile.role || 'student',
            name: profile ? `${profile.first_name} ${profile.last_name}` : profile.email,
            image: profile?.avatar_url,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-do-not-use-in-production',
};

export default NextAuth(authOptions);