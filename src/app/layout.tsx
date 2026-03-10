// import type { Metadata } from "next";
//
// export const metadata: Metadata = {
//   title: "Slate",
//   description: "Slate Application",
// };
//
// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html>
//       <body>{children}</body>
//     </html>
//   );
// }
import "@/app/globals.css";
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
