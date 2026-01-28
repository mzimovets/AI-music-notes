import React from "react";
import { Sidebar } from "./components/Sidebar";
import { PlaylistContextProvider } from "../playlist/[category]/PlaylistContextProvider";
import { getSongById } from "@/lib/utils";
import { StackContextProvider } from "./components/StackContextProvider";

// export default async function StackLayout({
//   children,
//   params,
// }: {
//   children: React.ReactNode;
//   params: { id: string };
// }) {
//   const { id } = params;
//   const song = await getSongById(id);

//   return (
//     <StackContextProvider>
//       <div className="min-h-screen flex">
//         <aside className="w-72 p-2 sticky top-0 h-screen overflow-y-auto border-r border-gray-300">
//           <PlaylistContextProvider songsResponse={song}>
//             <Sidebar />
//           </PlaylistContextProvider>
//         </aside>

//         {/* Divider */}
//         <div className="w-px bg-gray-300" />

//         {/* Content */}

//         <main className="flex-1 p-4">{children}</main>
//       </div>
//     </StackContextProvider>
//   );
// }

export default async function StackLayout({ children, params }) {
  const song = await getSongById(params.id);

  return (
    <StackContextProvider>
      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside
          className="
            fixed
            left-30
            top-16
            w-72
            h-[calc(100vh-4rem)]
            border-r
            border-gray-300
            
          "
        >
          <div className="relative h-full p-2 overflow-visible">
            <PlaylistContextProvider songsResponse={song}>
              <Sidebar />
            </PlaylistContextProvider>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="ml-72 mt-16 flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </StackContextProvider>
  );
}
