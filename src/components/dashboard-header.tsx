import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

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
          <Link
            href="/guide"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            接入指引
          </Link>
          <span className="text-sm text-zinc-600">{display}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
