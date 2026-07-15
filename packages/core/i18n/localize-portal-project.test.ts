import { describe, expect, it } from "vitest";
import type { PortalProject } from "../types/portal";
import { localizePortalProject } from "./localize-portal-project";

const base: PortalProject = {
  slug: "nha-hang",
  name: "Ứng dụng nhà hàng",
  description: "Quản lý đơn hàng",
  industry: "F&B",
  features: ["Đặt bàn", "Thanh toán"],
  images: ["a.png"],
  demo_url: "https://demo",
  portfolio_url: "",
};

describe("localizePortalProject", () => {
  it("returns the base (Vietnamese) copy for vi", () => {
    const p = { ...base, i18n: { en: { name: "Restaurant app" } } };
    expect(localizePortalProject(p, "vi")).toBe(p);
  });

  it("applies English overrides per field", () => {
    const p = {
      ...base,
      i18n: {
        en: {
          name: "Restaurant app",
          description: "Order management",
          features: ["Reservations"],
        },
      },
    };
    const en = localizePortalProject(p, "en");
    expect(en.name).toBe("Restaurant app");
    expect(en.description).toBe("Order management");
    expect(en.features).toEqual(["Reservations"]);
    // Untranslated field falls back to the base copy.
    expect(en.industry).toBe("F&B");
    expect(en.slug).toBe("nha-hang");
  });

  it("falls back entirely when no en overrides exist", () => {
    expect(localizePortalProject(base, "en")).toBe(base);
    expect(localizePortalProject({ ...base, i18n: {} }, "en").name).toBe(base.name);
  });

  it("ignores empty-string and empty-array overrides", () => {
    const p = { ...base, i18n: { en: { name: "", features: [] } } };
    const en = localizePortalProject(p, "en");
    expect(en.name).toBe(base.name);
    expect(en.features).toEqual(base.features);
  });
});
