import React from "react";

export default function StackViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="stack-view-layout">
      {/* Navbar здесь нет */}
      <main>{children}</main>
    </div>
  );
}
