import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function DashboardHeader() {
  const session = await auth();
  const display = session?.user?.name ?? session?.user?.email ?? "用户";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold text-zinc-900">
          QQ Bot 网关
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">{display}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              退出
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
