import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/authPage", // куда редиректить если неавторизован
  },
});

export const config = {
  matcher: ["/((?!api|_next/static|favicon.ico|authPage).*)"], 
  // все страницы кроме /api, /_next/static, favicon и /authPage
};