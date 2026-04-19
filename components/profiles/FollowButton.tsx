"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { fetchFollowRelationship, followCreator, unfollowCreator } from "@/lib/profiles/client";

interface Relationship {
  iFollowThem: boolean;
  theyFollowMe: boolean;
}

/**
 * Follow / Follow-back / Unfollow button for a creator.
 * - Hides itself when the viewer is looking at their own profile.
 * - Shows "Follow back" when the creator already follows the viewer and
 *   the viewer doesn't follow them yet (asymmetric → quick social nudge).
 * - Shows "Following" (with hover-to-unfollow) when the viewer already
 *   follows the creator.
 * - Optimistic toggle, rolls back on error.
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
  const [rel, setRel] = useState<Relationship | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setRel({ iFollowThem: false, theyFollowMe: false }); return; }
      const r = await fetchFollowRelationship(creatorId);
      if (alive) setRel(r);
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
  if (rel === null) {
    return (
      <Button size={size} variant="ghost" disabled>
        <Loader2 size={14} className="animate-spin" />
      </Button>
    );
  }

  const { iFollowThem, theyFollowMe } = rel;

  async function toggle() {
    setBusy(true);
    const nextIFollow = !iFollowThem;
    setRel({ iFollowThem: nextIFollow, theyFollowMe });
    try {
      if (iFollowThem) await unfollowCreator(creatorId);
      else await followCreator(creatorId);
      onChange?.(nextIFollow);
    } catch (err) {
      setRel({ iFollowThem, theyFollowMe });
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <Button size={size} variant={iFollowThem ? "secondary" : variant} disabled>
        <Loader2 size={14} className="animate-spin" />
      </Button>
    );
  }

  if (iFollowThem) {
    return (
      <Button onClick={toggle} size={size} variant="secondary" className="group">
        <UserCheck size={14} />
        <span className="group-hover:hidden">Following</span>
        <span className="hidden group-hover:inline">Unfollow</span>
      </Button>
    );
  }

  if (theyFollowMe) {
    // Mutual-intent cue: they already follow the viewer, so one-click mirrors it.
    return (
      <Button onClick={toggle} size={size} variant={variant} title="They already follow you">
        <Repeat size={14} /> Follow back
      </Button>
    );
  }

  return (
    <Button onClick={toggle} size={size} variant={variant}>
      <UserPlus size={14} /> Follow
    </Button>
  );
}
