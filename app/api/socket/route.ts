import { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

export async function GET() {
  if (!globalThis.io) {
    globalThis.io = new Server(3001, {
      cors: {
        origin: "*",
      },
    });

    globalThis.io!.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join-stack", (stackId: string) => {
        socket.join(stackId);
      });

      socket.on("stack-updated", ({ stackId, songs }: { stackId: string; songs: any[] }) => {
        console.log("SERVER broadcast stack-updated", stackId, songs.length);

        // рассылаем ВСЕМ клиентам в комнате, включая отправителя
        globalThis.io!.in(stackId).emit("stack-updated", songs);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    console.log("Socket server started");
  }

  return new Response("Socket running");
}