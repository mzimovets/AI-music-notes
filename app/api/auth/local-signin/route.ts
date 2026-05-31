// Авто-вход на локальном сервере (плата).
// Доступен ТОЛЬКО когда IS_LOCAL_SERVER=true.
// Вызывается с основного сайта при переходе на плату — пользователь
// не вводит пароль повторно, плата входит за него по имени пользователя.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  // Только на локальном сервере
  if (process.env.IS_LOCAL_SERVER !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const redirect = searchParams.get("redirect") || "/";

  if (!username) {
    return NextResponse.redirect(new URL("/authPage", req.url));
  }

  // Получаем данные пользователя с бэкенда платы
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";
    const res = await fetch(`${backendUrl}/user/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("User not found");

    const data = await res.json();
    if (!data?.doc) throw new Error("User not found");

    const user = data.doc;

    // Создаём JWT-токен сессии
    const token = await encode({
      token: {
        sub: user._id,
        name: user.username,
        role: user.role,
        username: user.username,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Устанавливаем cookie сессии
    const isSecure = req.url.startsWith("https");
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const cookieStore = await cookies();
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 дней
    });

    return NextResponse.redirect(new URL(redirect, req.url));
  } catch {
    // Если что-то пошло не так — на страницу входа
    return NextResponse.redirect(new URL("/authPage", req.url));
  }
}
