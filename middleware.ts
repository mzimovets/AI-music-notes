import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/authPage", // куда редиректить если неавторизован
  },
});

export const config = {
  // Исключаем: api, _next/*, статические файлы, SW, оффлайн-ресурсы
  matcher: [
    "/((?!api|_next|favicon\\.ico|authPage|manifest\\.json|sw\\.js|workbox-.*\\.js|logo.*\\.png|apple-touch-icon.*\\.png|icons/.*|songs/.*|stacks/.*|meals-pdf/.*|fonts/.*).*)",
  ],
};