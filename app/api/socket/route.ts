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
      socket.on("join-stack", (stackId) => {
        socket.join(stackId);
      });

      socket.on("stack-updated", ({ stackId, songs }) => {
        global.io.in(stackId).emit("stack-updated", songs);
      });

      socket.on("disconnect", () => {});
    });
  }

  return new Response("Socket running");
}
