import { getAuthenticatedUser } from "@/lib/auth";
import HomeNavbar from "./_components/ui/HomeNavbar";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  return (
    <main className="min-h-screen">
      <div className="relative min-h-screen w-full">
        <HomeNavbar username={user ? user.username : ""} />
        {children}
      </div>
    </main>
  );
}
