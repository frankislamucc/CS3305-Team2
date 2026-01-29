export default function WhiteBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex flex-col h-screen w-screen">{children}</main>;
}
