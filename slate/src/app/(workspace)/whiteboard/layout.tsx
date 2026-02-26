import { logoutAction } from "@/app/(auth)/actions/logout";
import { getAuthenticatedUser } from "@/lib/auth";
import { IUser } from "@/app/models/User";
import Header from "./_components/ui/Header";
import { UserProvider } from "./_components/UserContext";

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
        <UserProvider
          userId={user ? user._id.toString() : ""}
          username={user ? user.username : ""}
        >
          {children}
        </UserProvider>
      </div>
    </main>
  );
}
