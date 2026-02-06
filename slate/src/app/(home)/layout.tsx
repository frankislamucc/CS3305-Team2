export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="h-full">{children}</main>;
}
