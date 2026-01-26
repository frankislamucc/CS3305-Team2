export default function WhiteBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex h-screen w-screen">{children}</main>;
}
