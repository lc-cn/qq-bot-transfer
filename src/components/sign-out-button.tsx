import { getAuthCsrfToken } from "@/lib/auth/csrf";
import { Button } from "@/components/ui/button";

/** 经 /api/auth/signout POST 退出（比 Server Action signOut 在 Worker 上更可靠） */
export async function SignOutButton() {
  const csrfToken = await getAuthCsrfToken();

  return (
    <form action="/api/auth/signout" method="POST">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/login" />
      <Button type="submit" variant="outline" size="sm">
        退出
      </Button>
    </form>
  );
}
