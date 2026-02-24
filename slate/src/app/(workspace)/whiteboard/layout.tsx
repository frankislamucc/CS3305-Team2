import { logoutAction } from "@/app/(auth)/actions/logout";
import { getAuthenticatedUser } from "@/lib/auth";
import { IUser } from "@/app/models/User";
import Header from "./_components/ui/Header";

export default async function WhiteBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getAuthenticatedUser()) as IUser;

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden">
      <Header username={user ? user.username : ""} />
      <div className="flex flex-1 min-h-0">
        {children}
      </div>
    </main>
  );
}
