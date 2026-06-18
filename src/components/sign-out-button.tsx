"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * 退出按钮：客户端获取 CSRF Token 后提交原生 form POST。
 * 不依赖 next-auth/react 的 signOut()，也不依赖 SSR 环境获取 CSRF。
 */
export function SignOutButton() {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/csrf");
      const data = (await res.json()) as { csrfToken: string };
      if (formRef.current) {
        const input = formRef.current.querySelector<HTMLInputElement>(
          'input[name="csrfToken"]',
        );
        if (input) input.value = data.csrfToken;
        formRef.current.submit();
      }
    } catch {
      // fallback: 尝试无 CSRF 提交，部分部署环境可能可用
      if (formRef.current) {
        const input = formRef.current.querySelector<HTMLInputElement>(
          'input[name="csrfToken"]',
        );
        if (input) input.value = "";
        formRef.current.submit();
      }
    }
  };

  return (
    <form
      ref={formRef}
      action="/api/auth/signout"
      method="POST"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="csrfToken" value="" />
      <input type="hidden" name="callbackUrl" value="/login" />
      <Button type="submit" variant="outline" size="sm">
        退出
      </Button>
    </form>
  );
}
