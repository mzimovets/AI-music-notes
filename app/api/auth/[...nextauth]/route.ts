import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(
          `http://localhost:4000/user/${credentials?.username}`
        );
        const data = await res.json();

        if (!data?.doc) return null;

        const isValid = await bcrypt.compare(
          credentials?.password || "",
          data.doc.password
        );
        if (!isValid) return null;

        return {
          id: data.doc._id,
          name: data.doc.username,
          role: data.doc.role,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) session.user.role = token.role;
      return session;
    },
  },

  pages: { signIn: "/authPage" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };