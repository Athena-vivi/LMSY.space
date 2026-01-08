# Magazine Upload Workflow - Implementation Guide

## Overview
Astra 馆长现在可以录入包含 20 张图片的杂志特辑（日期：2024-10-23）。系统已完整实装以下功能：

## 1. 数据库架构

### 迁移文件（请在 Supabase SQL Editor 中执行）
- `supabase/migrations/20250109_add_project_id_to_gallery.sql`
  - 添加 `project_id` 外键字段到 gallery 表
  - 添加 `blur_data` 字段用于渐进式图片加载
  - 添加 `event_date` 字段用于档案组织

- `supabase/migrations/20250109_add_magazine_fields_to_projects.sql`
  - 添加 `catalog_id` 字段到 projects 表
  - 添加 `blur_data` 字段到 projects 表

### 数据关系
```
projects (杂志主记录)
  ├─ id: UUID
  ├─ title: "杂志名称"
  ├─ category: "magazine"
  ├─ release_date: "2024-10-23"
  ├─ catalog_id: "LMSY-ED-2024-001"
  ├─ cover_url: "R2 CDN URL"
  └─ description: "策展人语"

gallery (内页图片)
  ├─ id: UUID
  ├─ image_url: "R2 CDN URL"
  ├─ project_id: → projects.id (外键)
  ├─ blur_data: "base64 占位符"
  └─ event_date: "2024-10-23"
```

## 2. 上传 API 端点

### POST /api/admin/magazine

**请求格式**: `multipart/form-data`

**必填字段**:
- `cover`: File - 杂志封面图片
- `title`: string - 杂志标题
- `release_date`: string - 发行日期 (YYYY-MM-DD)

**可选字段**:
- `description`: string - 策展人语（Markdown 格式）
- `curator_note`: string - 额外的策展备注
- `additional_images`: File[] - 内页图片（可多张）
- `caption_0`, `caption_1`, ...: string - 每张图片的说明

**响应示例**:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "catalog_id": "LMSY-ED-2024-001",
      "title": "Magazine Name",
      "release_date": "2024-10-23",
      "cover_url": "https://cdn...",
      "artifact_count": 20
    },
    "gallery_items": 19,
    "metadata": {
      "cover_size": 2500000,
      "cover_compressed": 450000,
      "additional_images": 19,
      "successfully_uploaded": 19
    }
  }
}
```

### GET /api/admin/magazine
获取下一个可用的 catalog ID 和统计信息

## 3. Catalog ID 系统

**格式**: `LMSY-ED-{YEAR}-{SEQUENCE}`

示例:
- `LMSY-ED-2024-001` - 2024 年第一本杂志
- `LMSY-ED-2024-002` - 2024 年第二本杂志
- `LMSY-ED-2025-001` - 2025 年第一本杂志

**生成规则**:
- 按年份自动编号
- 每年从 001 重新开始
- 由 `lib/catalog-id.ts` 中的 `generateNextEditorialCatalogId()` 函数生成

## 4. 前端页面

### /editorial - 杂志列表页
**功能**:
- 非对称垂直网格布局（移动端 1 列，平板 3 列，桌面 4 列）
- 3:4 宽高比的封面展位
- Viewfinder 风格的占位符（MAG_ISSUE_PENDING）
- 动态星云颜色同步（Lookmhee→琥珀色，Sonya→蓝色）
- 馆藏标签（左上角：#LMSY-ED-001，右下角：杂志名称）
- **[20 ARTIFACTS INSIDE]** 叠加层（右上角显示）
- Blur-up 图片加载效果

**数据源**: `projects` 表 WHERE `category = 'magazine'`

### /editorial/[id] - 杂志详情页
**功能**:
- 大字号显示杂志日期和策展人语
- 杂志封面完整展示（object-contain，不裁剪）
- **Masonry (瀑布流)** 布局展示内页图片
- **严禁强制裁剪**：所有图片使用 `object-contain` 完整显示
- CSS Columns 实现原生瀑布流（1/2/3 列响应式）
- 每张图片保持原始比例
- 悬停显示图片说明

**数据源**:
- 杂志信息: `projects` 表
- 内页图片: `gallery` 表 WHERE `project_id = magazine.id`

## 5. 图片处理

### 自动优化
- 所有图片自动转换为 **WebP 格式**（质量 85-90%）
- 封面质量: 90%
- 内页质量: 85%
- 使用 Sharp 库处理

### Blur Data 生成
- 使用 Plaiceholder 生成 10x10 基础模糊占位符
- 实现 progressive image loading（渐进式图片加载）
- 提升用户体验，减少布局偏移

### R2 存储路径
```
magazines/
  └─ {year}/
      ├─ {catalog_id}-cover.webp
      ├─ {catalog_id}-001.webp
      ├─ {catalog_id}-002.webp
      └─ ...
```

示例:
```
magazines/2024/LMSY-ED-2024-001-cover.webp
magazines/2024/LMSY-ED-2024-001-001.webp
magazines/2024/LMSY-ED-2024-001-002.webp
...
```

## 6. 使用流程

### 步骤 1: 执行数据库迁移
在 Supabase SQL Editor 中运行:
```sql
-- 运行这两个迁移文件
\i supabase/migrations/20250109_add_project_id_to_gallery.sql
\i supabase/migrations/20250109_add_magazine_fields_to_projects.sql
```

### 步骤 2: 准备图片
- 封面图片：命名为 cover
- 内页图片：按顺序编号（001-019）
- 可选：为每张图片准备说明文字

### 步骤 3: 使用 API 上传
```bash
curl -X POST https://your-domain.com/api/admin/magazine \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cover=@cover.jpg" \
  -F "title=October 2024 Special Issue" \
  -F "release_date=2024-10-23" \
  -F "description=This issue captures the ethereal beauty of..." \
  -F "additional_images=@001.jpg" \
  -F "additional_images=@002.jpg" \
  ... \
  -F "caption_0=Behind the scenes shot" \
  -F "caption_1=Candid moment"
```

### 步骤 4: 验证结果
1. 访问 `/editorial` 查看杂志列表
2. 确认封面右上角显示 **[20 ARTIFACTS INSIDE]**
3. 点击封面进入详情页
4. 验证 Masonry 布局正常显示
5. 确认所有图片完整显示（未裁剪）

## 7. 技术栈

- **数据库**: Supabase (PostgreSQL with lmsy_archive schema)
- **存储**: Cloudflare R2 (S3-compatible)
- **图片处理**: Sharp (WebP conversion, blur data)
- **前端**: Next.js 16 App Router, Framer Motion
- **样式**: Tailwind CSS
- **布局**: CSS Columns (Masonry)

## 8. 安全性

- 所有 API 端点需要身份验证
- 双重校验：Email 硬编码检查 + admin_users 表查询
- RLS 策略启用（公共数据可读，写入需认证）
- R2 客户端仅限服务端使用

## 9. 性能优化

- 图片自动 WebP 转换（压缩率 80%+）
- Blur-up loading 减少布局偏移
- Next.js Image 组件优化
- 响应式图片尺寸
- 懒加载画廊图片

## 10. 已实现文件清单

### 后端
- ✅ `lib/catalog-id.ts` - Catalog ID 生成（支持 ED 类型）
- ✅ `lib/image-processing.ts` - WebP 转换和 blur data
- ✅ `app/api/admin/magazine/route.ts` - 杂志上传 API
- ✅ `supabase/migrations/20250109_add_project_id_to_gallery.sql`
- ✅ `supabase/migrations/20250109_add_magazine_fields_to_projects.sql`

### 前端
- ✅ `lib/supabase/client.ts` - 公共客户端（schema 锁定到 lmsy_archive）
- ✅ `app/editorial/page.tsx` - 杂志列表页（含 artifact count overlay）
- ✅ `app/editorial/[id]/page.tsx` - 杂志详情页（Masonry 布局）

---

**状态**: ✅ 完整实装完成
**准备上传**: Astra 馆长可以开始录入 2024-10-23 的 20 张图片特辑
