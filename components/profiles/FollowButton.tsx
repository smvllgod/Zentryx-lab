"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { isFollowing, followCreator, unfollowCreator } from "@/lib/profiles/client";
import { cn } from "@/lib/utils/cn";

/**
 * Follow / Unfollow button for a creator. Hides itself when the viewer
 * is looking at their own profile. Optimistically toggles and rolls
 * back on error.
 */
export function FollowButton({
  creatorId,
  size = "sm",
  onChange,
  variant = "primary",
}: {
  creatorId: string;
  size?: "sm" | "md" | "lg";
  onChange?: (following: boolean) => void;
  variant?: "primary" | "secondary";
}) {
  const { user } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setFollowing(false); return; }
      const v = await isFollowing(creatorId);
      if (alive) setFollowing(v);
    })();
    return () => { alive = false; };
  }, [user, creatorId]);

  if (!user) {
    return (
      <Button asChild size={size} variant={variant}>
        <a href={`/sign-in?returnTo=/creator/${creatorId}`}>
          <UserPlus size={14} /> Follow
        </a>
      </Button>
    );
  }
  if (user.id === creatorId) return null;
  if (following === null) {
    return (
      <Button size={size} variant="ghost" disabled>
        <Loader2 size={14} className="animate-spin" />
      </Button>
    );
  }

  async function toggle() {
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) await unfollowCreator(creatorId);
      else await followCreator(creatorId);
      onChange?.(!prev);
    } catch (err) {
      setFollowing(prev);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={toggle}
      size={size}
      variant={following ? "secondary" : variant}
      disabled={busy}
      className={cn(following && "group")}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : following ? (
        <>
          <UserCheck size={14} />
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus size={14} /> Follow
        </>
      )}
    </Button>
  );
}
