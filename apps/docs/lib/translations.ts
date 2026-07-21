import type { Translations } from "fumadocs-ui/i18n";
import type { Lang } from "./i18n";

// Fumadocs built-in UI strings (search, TOC, last-updated, etc.) per locale.
// English uses Fumadocs defaults so we only override Vietnamese.
export const uiTranslations: Partial<Record<Lang, Partial<Translations>>> = {
  vi: {
    search: "Tìm kiếm",
    searchNoResult: "Không tìm thấy kết quả",
    toc: "Trên trang này",
    tocNoHeadings: "Không có mục nào",
    lastUpdate: "Cập nhật lần cuối",
    chooseLanguage: "Chọn ngôn ngữ",
    nextPage: "Trang sau",
    previousPage: "Trang trước",
    chooseTheme: "Đổi giao diện",
    editOnGithub: "Sửa trên GitHub",
  },
};

// Display name shown in the LanguageToggle dropdown.
export const localeLabels: Record<Lang, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

// Copy for the welcome page (Hero + Byline). Pages are translated as MDX;
// this dict only carries TSX-rendered chrome above the MDX body.
export const homeCopy = {
  en: {
    eyebrow: "UniAI Docs",
    titleLead: "Humans and agents,",
    titleAccent: "in one place.",
    byline: ["Getting started", "Updated April 2026", "6 min read"],
  },
  vi: {
    eyebrow: "Tài liệu UniAI",
    titleLead: "Con người và agent,",
    titleAccent: "cùng một nơi.",
    byline: ["Bắt đầu", "Cập nhật tháng 4/2026", "Đọc trong 6 phút"],
  },
} as const satisfies Record<Lang, unknown>;
