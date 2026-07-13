import { describe, it, expect } from "vitest";
import type { PortalProject } from "@multica/core/types/portal";
import {
  SITE_ORIGIN,
  absoluteUrl,
  buildPortalPageMetadata,
  buildProjectMetadata,
  organizationJsonLd,
  projectJsonLd,
  projectBreadcrumbJsonLd,
} from "./seo";

const project: PortalProject = {
  slug: "app-fnb",
  name: "App quản lý F&B",
  description: "Phần mềm quản lý chuỗi nhà hàng.",
  industry: "F&B",
  features: ["Đặt bàn"],
  images: ["/uploads/portal/fnb.png"],
  demo_url: "",
  portfolio_url: "",
};

describe("absoluteUrl", () => {
  it("prefixes relative paths with the site origin", () => {
    expect(absoluteUrl("/marketplace")).toBe(`${SITE_ORIGIN}/marketplace`);
  });

  it("leaves absolute URLs untouched", () => {
    expect(absoluteUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });
});

describe("buildProjectMetadata", () => {
  it("builds per-project title, canonical and Vietnamese OG tags", () => {
    const md = buildProjectMetadata(project);

    expect(md.title).toEqual({ absolute: "App quản lý F&B — UNICOM" });
    expect(md.description).toBe("Phần mềm quản lý chuỗi nhà hàng.");
    expect(md.alternates?.canonical).toBe("/marketplace/app-fnb");
    expect(md.openGraph?.locale).toBe("vi_VN");
    expect(md.openGraph?.siteName).toBe("UNICOM");
    expect(md.openGraph?.url).toBe(`${SITE_ORIGIN}/marketplace/app-fnb`);
  });

  it("uses the first project image as OG image, absolutized", () => {
    const md = buildProjectMetadata(project);
    expect(md.openGraph?.images).toEqual([
      `${SITE_ORIGIN}/uploads/portal/fnb.png`,
    ]);
  });

  it("falls back to the default OG image when the project has none", () => {
    const md = buildProjectMetadata({ ...project, images: [] });
    expect(md.openGraph?.images).toEqual([`${SITE_ORIGIN}/og.png`]);
  });

  it("truncates long descriptions to at most 160 characters", () => {
    const md = buildProjectMetadata({
      ...project,
      description: "x".repeat(400),
    });
    expect((md.description ?? "").length).toBeLessThanOrEqual(160);
  });

  it("falls back to a generic description when the project has none", () => {
    const md = buildProjectMetadata({ ...project, description: "" });
    expect(md.description).toBeTruthy();
  });
});

describe("buildPortalPageMetadata", () => {
  it("emits Vietnamese OG tags, canonical and the default OG image", () => {
    const md = buildPortalPageMetadata({
      title: "Chợ dự án — UNICOM",
      description: "Tham khảo các dự án.",
      path: "/marketplace",
    });

    expect(md.title).toEqual({ absolute: "Chợ dự án — UNICOM" });
    expect(md.alternates?.canonical).toBe("/marketplace");
    expect(md.openGraph?.locale).toBe("vi_VN");
    expect(md.openGraph?.url).toBe(`${SITE_ORIGIN}/marketplace`);
    expect(md.openGraph?.images).toEqual([`${SITE_ORIGIN}/og.png`]);
    expect(md.twitter?.images).toEqual([`${SITE_ORIGIN}/og.png`]);
  });
});

describe("JSON-LD builders", () => {
  it("organizationJsonLd describes UNICOM at the site origin", () => {
    const ld = organizationJsonLd();
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("UNICOM");
    expect(ld.url).toBe(SITE_ORIGIN);
  });

  it("projectJsonLd describes the project as CreativeWork with absolute URLs", () => {
    const ld = projectJsonLd(project);
    expect(ld["@type"]).toBe("CreativeWork");
    expect(ld.name).toBe(project.name);
    expect(ld.url).toBe(`${SITE_ORIGIN}/marketplace/app-fnb`);
    expect(ld.image).toBe(`${SITE_ORIGIN}/uploads/portal/fnb.png`);
  });

  it("projectBreadcrumbJsonLd walks home → marketplace → project", () => {
    const ld = projectBreadcrumbJsonLd(project);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[2]?.item).toBe(
      `${SITE_ORIGIN}/marketplace/app-fnb`,
    );
  });
});
