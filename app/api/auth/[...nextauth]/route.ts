import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const authOptions = {
  providers: [
    CredentialsProvider({
      id: "qr",
      name: "QR Code",
      credentials: {
        token: { type: "text" },
        otp: { type: "text" },
      },
      async authorize(credentials) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/auth/qr/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credentials?.token, otp: credentials?.otp }),
          },
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status !== "ok") return null;
        return { id: data.userId, name: data.username, role: data.role };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/user/${credentials?.username}`,
        );
        const data = await res.json();

        if (!data?.doc) return null;

        const isValid = await bcrypt.compare(
          credentials?.password || "",
          data.doc.password,
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

  session: { strategy: "jwt" as const },

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
