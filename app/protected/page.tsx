import { getUser, signOut } from "$/actions/auth";
import { redirect } from "next/navigation";
import { Button } from "$/components/ui/button";
import Link from "next/link";

export default async function ProtectedPage() {
  const user = await getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Protected Page</h1>
          <p className="mt-2 text-gray-600">
            You&apos;re signed in as{" "}
            <span className="font-medium">{user.email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <h2 className="text-lg font-medium">User Information</h2>
            <div className="mt-2 text-sm">
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Last Sign In:</strong>{" "}
                {new Date(user.last_sign_in_at || "").toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Link href="/protected/clubs">
              <Button className="w-full">My Clubs</Button>
            </Link>
            
            <form action={signOut}>
              <Button type="submit" className="w-full" variant="outline">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
