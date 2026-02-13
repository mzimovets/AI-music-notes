import { Server } from "socket.io";

export async function GET() {
  // @ts-ignore
  if (!global.io) {
    // @ts-ignore
    global.io = new Server(3001, {
      cors: {
        origin: "*",
      },
    });

    // @ts-ignore
    global.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join-stack", (stackId) => {
        socket.join(stackId);
      });

      socket.on("stack-updated", ({ stackId, songs }) => {
  console.log("SERVER broadcast stack-updated", stackId, songs.length);

  // рассылаем ВСЕМ клиентам в комнате, включая отправителя
  global.io.in(stackId).emit("stack-updated", songs);
});

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    console.log("Socket server started");
  }

  return new Response("Socket running");
}