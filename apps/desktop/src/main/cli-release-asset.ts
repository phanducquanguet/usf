// Current releases ship `uniai-cli-*` archives; releases published before
// the CLI rename ship `multica-cli-*` (and the oldest only `multica_*`).
// Single source of truth for which binary name each archive family contains.
const RELEASE_ARCHIVES = [
  { prefix: "uniai-cli-", binary: "uniai" },
  { prefix: "multica-cli-", binary: "multica" },
] as const;

function platformArchiveDescriptor(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): { os: string; arch: string; ext: string } {
  const osMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };
  const archMap: Record<string, string> = {
    x64: "amd64",
    arm64: "arm64",
  };
  const os = osMap[platform];
  const mappedArch = archMap[arch];
  if (!os || !mappedArch) {
    throw new Error(
      `unsupported platform for CLI auto-install: ${platform}/${arch}`,
    );
  }
  const ext = platform === "win32" ? "zip" : "tar.gz";
  return { os, arch: mappedArch, ext };
}

export function selectPlatformReleaseAssetName(
  assetNames: Iterable<string>,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  const { os, arch: mappedArch, ext } = platformArchiveDescriptor(
    platform,
    arch,
  );
  const names = [...assetNames];

  // Prefer the versioned `<prefix><v>-<os>-<arch>.<ext>` names (current
  // `uniai-cli-` first, then pre-rename `multica-cli-`); fall back to the
  // legacy `multica_<os>_<arch>.<ext>` so older releases that only ship the
  // legacy archive keep working.
  const suffix = `-${os}-${mappedArch}.${ext}`;
  for (const { prefix } of RELEASE_ARCHIVES) {
    const matches = names.filter(
      (name) => name.startsWith(prefix) && name.endsWith(suffix),
    );
    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length > 1) {
      throw new Error(
        `multiple release assets matched current platform ${suffix}: ${matches.join(", ")}`,
      );
    }
  }

  const legacyName = `multica_${os}_${mappedArch}.${ext}`;
  if (names.includes(legacyName)) {
    return legacyName;
  }

  throw new Error(`no release asset found for current platform: ${suffix}`);
}

/**
 * Name of the binary inside a given release archive: `uniai(.exe)` for
 * current archives, `multica(.exe)` for pre-rename and legacy `multica_*`
 * ones.
 */
export function archiveBinaryName(
  assetName: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const base =
    RELEASE_ARCHIVES.find((a) => assetName.startsWith(a.prefix))?.binary ??
    "multica";
  return platform === "win32" ? `${base}.exe` : base;
}
