import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Prevent build failure if env vars are missing
const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase');

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Supabase",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!isConfigured) {
          console.error("Supabase not configured - missing environment variables");
          return null;
        }
        
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const supabase = createClient(supabaseUrl, supabaseAnonKey);

          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error || !data.user) {
            console.error("Auth error:", error?.message);
            return null;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          return {
            id: data.user.id,
            email: data.user.email,
            role: profile?.role || 'student',
            name: profile ? `${profile.first_name} ${profile.last_name}` : data.user.email,
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