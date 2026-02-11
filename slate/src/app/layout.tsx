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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
