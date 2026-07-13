import { describe, expect, it } from "vitest";

import {
  archiveBinaryName,
  selectPlatformReleaseAssetName,
} from "./cli-release-asset";

describe("selectPlatformReleaseAssetName", () => {
  it("prefers the current uniai archive when all names exist", () => {
    const assetNames = [
      "checksums.txt",
      "multica_darwin_amd64.tar.gz",
      "multica-cli-1.2.3-darwin-amd64.tar.gz",
      "uniai-cli-1.2.3-darwin-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "darwin", "x64")).toBe(
      "uniai-cli-1.2.3-darwin-amd64.tar.gz",
    );
  });

  it("prefers the pre-rename versioned archive over the legacy one", () => {
    const assetNames = [
      "checksums.txt",
      "multica_darwin_amd64.tar.gz",
      "multica-cli-1.2.3-darwin-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "darwin", "x64")).toBe(
      "multica-cli-1.2.3-darwin-amd64.tar.gz",
    );
  });

  it("falls back to the legacy archive name when only legacy is present", () => {
    const assetNames = ["checksums.txt", "multica_darwin_amd64.tar.gz"];

    expect(selectPlatformReleaseAssetName(assetNames, "darwin", "x64")).toBe(
      "multica_darwin_amd64.tar.gz",
    );
  });

  it("matches the renamed darwin archive from release assets", () => {
    const assetNames = [
      "checksums.txt",
      "multica-cli-1.2.3-darwin-amd64.tar.gz",
      "multica-cli-1.2.3-darwin-arm64.tar.gz",
      "multica-cli-1.2.3-linux-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "darwin", "x64")).toBe(
      "multica-cli-1.2.3-darwin-amd64.tar.gz",
    );
  });

  it("matches the renamed windows zip archive", () => {
    const assetNames = [
      "multica-cli-1.2.3-windows-amd64.zip",
      "multica-cli-1.2.3-linux-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "win32", "x64")).toBe(
      "multica-cli-1.2.3-windows-amd64.zip",
    );
  });

  it("fails when the current platform asset is missing", () => {
    expect(() =>
      selectPlatformReleaseAssetName(
        ["multica-cli-1.2.3-linux-amd64.tar.gz", "multica_linux_amd64.tar.gz"],
        "darwin",
        "arm64",
      ),
    ).toThrow(/no release asset found/);
  });
});

describe("archiveBinaryName", () => {
  it("maps current archives to the uniai binary", () => {
    expect(
      archiveBinaryName("uniai-cli-1.2.3-darwin-arm64.tar.gz", "darwin"),
    ).toBe("uniai");
    expect(
      archiveBinaryName("uniai-cli-1.2.3-windows-amd64.zip", "win32"),
    ).toBe("uniai.exe");
  });

  it("maps pre-rename archives to the multica binary", () => {
    expect(
      archiveBinaryName("multica-cli-1.2.3-darwin-arm64.tar.gz", "darwin"),
    ).toBe("multica");
    expect(archiveBinaryName("multica_windows_amd64.zip", "win32")).toBe(
      "multica.exe",
    );
  });
});
