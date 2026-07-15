"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";
import { resolvePublicFileUrl } from "@multica/core/workspace/avatar-url";

/** Circle avatar for the consulting agent: the configured image when it
 * exists and loads, otherwise the portal's signature Bot-on-gradient mark.
 * Decorative — the agent's name is always adjacent text. Accepts the raw
 * `avatar_url` from the public config and resolves it against the API base. */
export function AgentAvatar({
  src,
  className,
  iconClassName,
}: {
  src?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  // A config refetch can deliver a new (working) URL after the old one
  // errored — the failure belongs to the URL, not the component.
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const resolved = src ? resolvePublicFileUrl(src) : null;
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-start to-brand-end",
        className,
      )}
    >
      {resolved && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Bot className={cn("text-white", iconClassName)} />
      )}
    </div>
  );
}
