-- Seed one sample marketplace project into the portal workspace.
-- Usage:
--   psql "$DATABASE_URL" -v portal_slug='<PORTAL_WORKSPACE_SLUG>' -f scripts/seed-portal-project.sql
-- Idempotent: re-running updates the same row (workspace_id + slug is unique).
INSERT INTO portal_project (
    workspace_id, slug, name, description, industry, features, images,
    demo_url, portfolio_url, source_url, published, sort_order
)
SELECT
    w.id,
    'ung-dung-quan-ly-nha-hang',
    'Ứng dụng quản lý nhà hàng',
    'Hệ thống quản lý nhà hàng trọn gói: đặt bàn trực tuyến, gọi món bằng QR tại bàn, '
    || 'quản lý kho nguyên liệu và báo cáo doanh thu theo ca. Triển khai cho chuỗi 3 chi nhánh, '
    || 'vận hành ổn định hơn 12 tháng.',
    'F&B',
    ARRAY[
        'Đặt bàn trực tuyến, nhắc lịch qua Zalo',
        'Gọi món bằng mã QR tại bàn',
        'Quản lý kho nguyên liệu, cảnh báo tồn thấp',
        'Báo cáo doanh thu theo ca, theo chi nhánh',
        'Phân quyền nhân viên: thu ngân, bếp, quản lý'
    ],
    ARRAY[]::text[],
    'https://demo.unicomhub.com/restaurant',
    'https://unicomhub.com/portfolio/restaurant',
    'git@github.com:unicomhub/restaurant-suite.git',
    true,
    0
FROM workspace w
WHERE w.slug = :'portal_slug'
ON CONFLICT (workspace_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    industry = EXCLUDED.industry,
    features = EXCLUDED.features,
    demo_url = EXCLUDED.demo_url,
    portfolio_url = EXCLUDED.portfolio_url,
    source_url = EXCLUDED.source_url,
    published = EXCLUDED.published,
    updated_at = now();

SELECT slug, name, industry, published
FROM portal_project
WHERE slug = 'ung-dung-quan-ly-nha-hang';
