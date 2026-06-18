import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

type Props = {
  active?: "guide" | "home";
};

export async function SiteHeader({ active }: Props) {
  const session = await auth();
  const loggedIn = Boolean(session?.user?.id);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <nav className="flex items-center gap-4">
          <Link
            href={loggedIn ? "/" : "/guide"}
            className="font-semibold text-zinc-900"
          >
            QQ Bot 网关
          </Link>
          <Link
            href="/guide"
            className={
              active === "guide"
                ? "text-sm font-medium text-zinc-900"
                : "text-sm text-zinc-500 hover:text-zinc-800"
            }
          >
            接入指引
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <>
              <span className="hidden text-sm text-zinc-600 sm:inline">
                {session?.user?.name ?? session?.user?.email}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/">控制台</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">登录</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
