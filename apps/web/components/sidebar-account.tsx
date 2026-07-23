import Link from "next/link";
import type { SessionUser } from "../lib/auth/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SidebarAccountProps = {
  user: SessionUser;
};

export function SidebarAccount({ user }: SidebarAccountProps) {
  return (
    <div className="space-y-3 px-3 py-4">
      <Separator />
      <p className="truncate px-1 text-xs text-muted-foreground" title={user.email ?? undefined}>
        {user.email ?? "Signed in"}
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full justify-center" asChild>
          <Link href="/settings">Settings</Link>
        </Button>
        <form action="/auth/signout" method="post" className="w-full">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-center text-primary">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
