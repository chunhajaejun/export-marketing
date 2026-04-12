import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SignOutButton } from "./signout-button";

export default async function PendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">승인 대기 중</CardTitle>
          <CardDescription>
            관리자의 승인을 기다리고 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{user.email}</span>
            {" "}계정이 현재 승인 대기 상태입니다.
          </p>
          <p className="text-sm text-muted-foreground">
            관리자가 승인하면 대시보드를 이용하실 수 있습니다.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
