"use client";

import { useEffect, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@multica/ui/components/ui/tabs";
import {
  detectInstallOS,
  INSTALL_OS_LABELS,
  type InstallOS,
} from "./install-command";
import { useT } from "../i18n";

const OS_OPTIONS: InstallOS[] = ["unix", "windows"];

/**
 * Detected OS as state. Starts as "unix" and resolves after mount so the
 * server render never disagrees with the client (SSR has no navigator).
 */
export function useInstallOS() {
  const [os, setOs] = useState<InstallOS>("unix");
  useEffect(() => {
    setOs(detectInstallOS());
  }, []);
  return [os, setOs] as const;
}

export function InstallOsToggle({
  os,
  onChange,
}: {
  os: InstallOS;
  onChange: (os: InstallOS) => void;
}) {
  const { t } = useT("common");
  return (
    <Tabs value={os} onValueChange={(v) => onChange(v as InstallOS)}>
      <TabsList aria-label={t(($) => $.install_os.aria_label)}>
        {OS_OPTIONS.map((option) => (
          <TabsTrigger key={option} value={option} className="px-2 text-xs">
            {INSTALL_OS_LABELS[option]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
