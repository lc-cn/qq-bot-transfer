"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

/** 客户端退出按钮：由 next-auth/react 处理 CSRF token 获取与 redirect */
export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      退出
    </Button>
  );
}
