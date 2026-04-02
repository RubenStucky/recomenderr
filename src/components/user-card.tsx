"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { TautulliUser } from "@/types";

interface UserCardProps {
  user: TautulliUser;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Link href={`/user/${user.userId}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:ring-2 hover:ring-purple-500/50">
        <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
          <Avatar size="lg" className="h-20 w-20">
            {user.thumb ? (
              <AvatarImage src={user.thumb} alt={user.username} />
            ) : null}
            <AvatarFallback className="text-lg">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-base font-medium text-foreground">
            {user.username}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
