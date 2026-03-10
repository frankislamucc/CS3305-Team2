import { getAuthenticatedUser } from "@/lib/auth";
import HomeNavbar from "@/app/(home)/_components/ui/HomeNavbar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  return (
    <main className="min-h-screen">
      <div className="relative w-full px-4 py-3">
        <HomeNavbar username={user ? user.username : ""} />
      </div>
      <div style={{ height: "var(--nav-height, 0px)" }} aria-hidden="true" />
      {children}
    </main>
  );
}
