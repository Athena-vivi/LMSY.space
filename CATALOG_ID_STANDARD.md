# Catalog ID Standard - Astra 馆长档案系统

## Overview

本文档定义了 LMSY.SPACE 馆藏编号的官方标准。所有新增数据必须严格遵循此格式。

## 格式规范

### 新格式（自 2025-01-09 起生效）

```
LMSY-[CATEGORY]-[YYYYMMDD]-[XXX]
```

**组成部分**:
1. **LMSY** - 固定前缀
2. **CATEGORY** - 分类代码（见下表）
3. **YYYYMMDD** - 事件日期（8位数字，紧凑格式）
4. **XXX** - 序号（3位数字，000-999）

**示例**:
```
LMSY-MAG-20241023-000  ← 杂志封面（2024年10月23日）
LMSY-MAG-20241023-001  ← 杂志第1页（2024年10月23日）
LMSY-MAG-20241023-002  ← 杂志第2页（2024年10月23日）
LMSY-G-20241023-001    ← 画廊图片（2024年10月23日）
```

### 分类代码 (CATEGORY)

| 代码 | 名称 | 用途 | 序号规则 |
|------|------|------|----------|
| MAG | Magazine | 杂志特辑 | 000=封面, 001+=内页 |
| G   | Gallery  | 画廊图片 | 001+ (从1开始) |
| P   | Project  | 项目记录 | 001+ (从1开始) |

### 序号规则

#### 杂志 (MAG)
- **000** - 封面图片（固定）
- **001-999** - 内页图片（按上传顺序自动递增）

#### 画廊 (G)
- **001-999** - 画廊图片（按上传顺序自动递增）

#### 项目 (P)
- **001-999** - 项目记录（按创建顺序自动递增）

## 日期处理

### 时区安全

**关键原则**: 日期必须使用 **YYYY-MM-DD** 格式的本地日期，避免时区转换错误。

```typescript
// ✅ 正确：直接使用用户输入的日期
const eventDate = "2024-10-23";  // 用户提供的本地日期
const catalogId = generateCatalogId({
  category: 'MAG',
  eventDate,  // 直接使用，不转换
  sequence: 0,
});
// 结果: LMSY-MAG-20241023-000

// ❌ 错误：使用 Date 对象转换
const date = new Date("2024-10-23");  // 可能引入时区问题
const catalogId = `LMSY-MAG-${date.getFullYear()}...`;
```

### 日期验证

```typescript
// 验证日期格式
function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

// 使用
if (!isValidDateFormat(eventDate)) {
  throw new Error('Invalid date format. Expected YYYY-MM-DD');
}
```

### 紧凑日期转换

```typescript
// YYYY-MM-DD → YYYYMMDD
function formatDateToCompact(dateString: string): string {
  return dateString.replace(/-/g, '');  // "2024-10-23" → "20241023"
}

// YYYYMMDD → YYYY-MM-DD
function formatCompactToDate(compactDate: string): string {
  return [
    compactDate.substring(0, 4),  // 年
    compactDate.substring(4, 6),  // 月
    compactDate.substring(6, 8),  // 日
  ].join('-');  // "20241023" → "2024-10-23"
}
```

## 序号递增逻辑

### 按日期重置

序号**每天重置**，不是全局递增。

**示例场景**:

```
2024-10-23:
  LMSY-MAG-20241023-000  (封面)
  LMSY-MAG-20241023-001  (第1页)
  LMSY-MAG-20241023-002  (第2页)

2024-10-24:
  LMSY-MAG-20241024-000  (封面，新的一天，序号重置)
  LMSY-MAG-20241024-001  (第1页)
```

### 自动递增算法

```typescript
async function getNextSequence(
  supabase: any,
  category: 'MAG' | 'G',
  eventDate: string  // "2024-10-23"
): Promise<number> {
  const compactDate = formatDateToCompact(eventDate);
  const prefix = `LMSY-${category}-${compactDate}`;

  // 查询当天该分类的最大序号
  const { data } = await supabase
    .from('gallery')
    .select('catalog_id')
    .like('catalog_id', `${prefix}-%`)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.catalog_id) {
    return 0;  // 当天无数据，从000开始
  }

  // 解析最大序号并+1
  const sequence = parseInt(data.catalog_id.split('-')[3], 10);
  return sequence + 1;
}
```

## R2 存储路径

### 文件命名规则

**R2 文件名必须与 catalog_id 完全一致**（不含扩展名）。

```
格式: {category}/{year}/{catalog_id}.webp

示例:
  magazines/2024/LMSY-MAG-20241023-000.webp
  magazines/2024/LMSY-MAG-20241023-001.webp
  gallery/2024/LMSY-G-20241023-001.webp
```

### 路径生成

```typescript
function getR2Path(catalogId: string): string {
  const parsed = parseCatalogId(catalogId);
  const year = parsed.date.substring(0, 4);  // 从 YYYY-MM-DD 提取年份

  const category = parsed.category === 'MAG' ? 'magazines' : 'gallery';

  return `${category}/${year}/${catalogId}.webp`;
}
```

## API 使用

### 杂志上传 (POST /api/admin/magazine)

**请求参数**:
```typescript
const formData = new FormData();
formData.append('cover', coverFile);        // 封面图片
formData.append('title', 'Magazine Name');  // 杂志标题
formData.append('event_date', '2024-10-23'); // 事件日期（用于 catalog_id）
formData.append('description', '...');      // 策展人语
formData.append('additional_images', page1); // 内页图片1
formData.append('additional_images', page2); // 内页图片2
// ... 更多内页
```

**响应**:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "catalog_id": "LMSY-MAG-20241023-000",  // 封面编号
      "title": "Magazine Name",
      "event_date": "2024-10-23",
      "cover_url": "https://cdn...",
      "artifact_count": 20
    },
    "gallery_items": 19,
    "metadata": {
      "cover_catalog_id": "LMSY-MAG-20241023-000",
      "additional_images": 19,
      "successfully_uploaded": 19
    }
  }
}
```

### 画廊上传 (POST /api/admin/upload)

**请求参数**:
```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('event_date', '2024-10-23');  // 必填
formData.append('caption', 'Photo description');
formData.append('is_featured', 'true');
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "catalog_id": "LMSY-G-20241023-001",  // 自动生成
    "image_url": "https://cdn...",
    "r2_path": "gallery/2024/LMSY-G-20241023-001.webp",
    "event_date": "2024-10-23"
  }
}
```

## 旧格式迁移

### 旧格式识别

```
旧格式: LMSY-G-2024-001
新格式: LMSY-G-20240101-001
```

### 迁移脚本

```bash
# 生成迁移计划（dry-run）
tsx scripts/migrate-legacy-catalog-ids.ts --table=gallery

# 执行迁移
tsx scripts/migrate-legacy-catalog-ids.ts --table=gallery --no-dry-run
```

**迁移步骤**:
1. 备份数据库
2. 运行迁移脚本（dry-run 模式）
3. 检查生成的 catalog_ids 是否正确
4. 运行迁移脚本（live 模式）
5. 执行 R2 文件重命名命令
6. 验证数据完整性

## 数据库完整性

### 约束

```sql
-- catalog_id 唯一约束
ALTER TABLE lmsy_archive.gallery ADD CONSTRAINT unique_catalog_id UNIQUE (catalog_id);
ALTER TABLE lmsy_archive.projects ADD CONSTRAINT unique_catalog_id UNIQUE (catalog_id);

-- event_date 非空约束
ALTER TABLE lmsy_archive.gallery ALTER COLUMN event_date SET NOT NULL;
```

### 索引

```sql
-- 加速按日期查询
CREATE INDEX idx_gallery_event_date ON lmsy_archive.gallery(event_date DESC);
CREATE INDEX idx_projects_release_date ON lmsy_archive.projects(release_date DESC);

-- 加速 catalog_id 搜索
CREATE INDEX idx_gallery_catalog_id ON lmsy_archive.gallery(catalog_id);
CREATE INDEX idx_projects_catalog_id ON lmsy_archive.projects(catalog_id);

-- 加速按前缀搜索（用于序号递增）
CREATE INDEX idx_gallery_catalog_prefix ON lmsy_archive.gallery(catalog_id text_pattern_ops);
```

## 验证规则

### 格式验证

```typescript
function isValidCatalogId(catalogId: string): boolean {
  return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId);
}

// 使用
if (!isValidCatalogId(catalogId)) {
  throw new Error(`Invalid catalog_id format: ${catalogId}`);
}
```

### 封面识别

```typescript
function isCoverImage(catalogId: string): boolean {
  return catalogId.endsWith('-000');
}

// 使用
if (isCoverImage(catalogId)) {
  console.log('This is a cover image');
}
```

## 常见问题

### Q: 为什么日期放在年份后面？

A: 紧凑日期格式 (YYYYMMDD) 可以直接排序，也便于人类阅读。按日期查询时更高效。

### Q: 序号每天重置，会不会冲突？

A: 不会。catalog_id 包含完整日期，每天的序号独立计算。

### Q: 如果一天上传超过 999 张图片怎么办？

A: 当前设计支持每天最多 999 张（含封面）。如果超出，需要使用下一天日期。

### Q: 旧数据需要立即迁移吗？

A: 建议迁移，但不是强制的。系统会同时支持新旧格式的读取。

### Q: 如何处理时区？

A: 使用 UTC 日期或要求用户提供 YYYY-MM-DD 格式的本地日期，避免时区转换。

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v2.0 | 2025-01-09 | 新格式：LMSY-[CATEGORY]-YYYYMMDD-XXX |
| v1.0 | 2024-12-XX | 旧格式：LMSY-[TYPE]-YYYY-XXX |

---

**维护者**: Astra 馆长
**最后更新**: 2025-01-09
