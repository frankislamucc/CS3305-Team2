import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Slate",
  description: "Slate Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-screen">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
