import { NavBackButton } from "./components/NavBackButton";

export default function PlaylistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col justify-center gap-4  container">
      <NavBackButton />

      {children}
    </section>
  );
}
