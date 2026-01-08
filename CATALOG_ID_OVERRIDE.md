# Catalog ID 解除锁定功能 - Astra 馆长最终解释权

## 功能概述

Astra 馆长现在拥有对 Catalog ID 的完全控制权，可以随时解除系统锁定，手动编辑编号。

## UI 设计

### 1. 锁定/解锁按钮

**位置**: Catalog ID 输入框右侧的小图标按钮

**图标**:
- 🔒 锁定状态: `Lock` 图标（白色/40）
- 🔓 解锁状态: `Unlock` 图标（lmsy-yellow/60）

**交互**:
```typescript
// 点击切换锁定状态
onClick={() => setIsCatalogLocked(!isCatalogLocked)}
```

### 2. 输入框状态

**锁定状态** (默认):
```
┌─────────────────────────────────────────┐
│ # Catalog ID    [🔒]                    │
│ LMSY-G-20250109-001                      │
│ Auto-generated • Format: LMSY-G-YYYYMMDD-XXX │
└─────────────────────────────────────────┘
```
- 文本: `text-lmsy-yellow/90` (金色光晕)
- 光标: `cursor-not-allowed`
- 光晕: `text-shadow: 0 0 10px rgba(251, 191, 36, 0.3)`
- 边框: `1px solid rgba(255, 255, 255, 0.1)` (灰色细线)
- 只读: `readOnly={true}`
- 自动更新: 随日期变化自动刷新编号

**解锁状态**:
```
┌─────────────────────────────────────────┐
│ # Catalog ID    [🔓]                    │
│ LMSY-G-20250109-001                      │
│ ✓ Manual edit                            │
│ ~~~~~~~~~~~~~~~~~~~~~~                    │  ← 呼吸光效
└─────────────────────────────────────────┘
```
- 文本: `text-white/90` (白色)
- 光标: `cursor-text`
- 可编辑: 接受键盘输入
- 边框: `1px solid transparent`
- 呼吸光效: lmsy-yellow 渐变动画

### 3. 视觉反馈

#### 正常格式提示
- 锁定: 灰色文字 "Auto-generated"
- 解锁: 金色文字 "✓ Manual edit" 或 "Unlocked • Ready for custom input"

#### 格式偏离警告 (微弱提醒，不拦截)
```
┌─────────────────────────────────────────┐
│ # Catalog ID    [🔓]                    │
│ LMSY-G-XXXXX-XXX                         │  ← 格式偏离
│ ✓ Manual edit                            │
└─────────────────────────────────────────┘
     ↑ 边框变为红色: rgba(239, 68, 68, 0.5)
```

**验证规则**:
```typescript
// 弱验证：仅提供视觉提示，不阻止提交
const isValidCatalogFormat = (catalogId: string): boolean => {
  if (!catalogId) return true;
  return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId);
};
```

**警告显示**:
- 边框颜色: `rgba(239, 68, 68, 0.5)` (微红色)
- 阴影: 红色光晕
- 不拦截提交（馆长有权使用自定义格式）

#### 呼吸光效动画
```typescript
<motion.div
  className="absolute bottom-0 left-0 right-0 h-0.5"
  style={{ background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.8), transparent)' }}
  animate={{
    opacity: [0.3, 1, 0.3],
    scaleX: [0.5, 1, 0.5],
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  }}
/>
```

## 智能联动逻辑

### 自动更新规则

```typescript
// 仅在锁定状态下自动更新
useEffect(() => {
  // 如果解锁或已手动编辑，不再自动更新
  if (!isCatalogLocked || hasManuallyEdited) return;

  const fetchNextCatalogId = async () => {
    const response = await fetch('/api/admin/upload');
    const data = await response.json();
    setArchiveNumber(data.next_catalog_id);
  };

  fetchNextCatalogId();
}, [eventDate, isCatalogLocked, hasManuallyEdited]);
```

**触发条件**:
- ✅ 锁定状态 (`isCatalogLocked = true`)
- ✅ 未手动编辑 (`hasManuallyEdited = false`)
- ✅ 日期改变 (`eventDate` 变化)

**停止自动更新**:
- ❌ 解锁状态
- ❌ 手动编辑过 (`hasManuallyEdited = true`)

### 手动编辑检测

```typescript
const handleCatalogIdChange = (value: string) => {
  setArchiveNumber(value);
  setHasManuallyEdited(true);  // 标记为已手动编辑
};
```

**效果**:
一旦手动编辑，系统永久停止自动覆盖该编号。

## API 支持

### 后端逻辑

```typescript
// API 接受手动 catalog_id
const manualCatalogId = formData.get('catalog_id') as string | null;

if (manualCatalogId && manualCatalogId.trim()) {
  // 使用手动提供的编号（馆长的最终解释权）
  catalogId = manualCatalogId.trim();
  console.log('[UPLOAD] Using manual catalog_id:', catalogId);

  // 尝试从手动编号中提取日期
  const match = catalogId.match(/^LMSY-[A-Z]+-(\d{8})-\d{3}$/);
  if (match) {
    const compactDate = match[1];
    uploadDate = `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
  }
} else {
  // 自动生成编号
  catalogId = await generateNextGalleryCatalogId(supabaseAdmin, uploadDate);
}
```

### 前端发送

```typescript
// 仅在解锁且手动编辑时发送
if (!isCatalogLocked && hasManuallyEdited && archiveNumber) {
  formData.append('catalog_id', archiveNumber);
}
```

## 使用场景

### 场景 1: 自动模式（默认）
```
1. 选择日期: 2024-10-23
2. 系统自动生成: LMSY-G-20241023-001
3. 上传 → 使用自动生成的编号
```

### 场景 2: 手动指定编号
```
1. 点击 [🔓] 解锁
2. 手动输入: LMSY-G-20241023-999
3. 系统检测: "✓ Manual edit"
4. 上传 → 使用手动指定的编号
```

### 场景 3: 格式偏离警告
```
1. 点击 [🔓] 解锁
2. 手动输入: LMSY-SPECIAL-001
3. 系统提示: 边框变红（微弱提醒）
4. 上传 → 仍然允许提交（馆长有权决定）
```

## 代码结构

### 状态变量
```typescript
const [isCatalogLocked, setIsCatalogLocked] = useState(true);      // 锁定状态
const [hasManuallyEdited, setHasManuallyEdited] = useState(false); // 手动编辑标记
```

### 验证函数
```typescript
const isValidCatalogFormat = (catalogId: string): boolean => {
  if (!catalogId) return true;
  return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId);
};
```

### 处理函数
```typescript
// 切换锁定状态
const toggleLock = () => setIsCatalogLocked(!isCatalogLocked);

// 手动编辑处理
const handleCatalogIdChange = (value: string) => {
  setArchiveNumber(value);
  setHasManuallyEdited(true);
};
```

## 设计原则

### 1. 馆长至上
- 手动编辑优先级最高
- 系统永不覆盖手动输入
- 格式警告仅为提示，不强制执行

### 2. 默认智能
- 默认锁定，自动生成
- 减少手动操作
- 降低出错概率

### 3. 视觉反馈
- 锁定/解锁状态清晰可辨
- 格式偏离用红色阴影提醒（不拦截）
- 呼吸光效提示"已放权"

### 4. 渐进式交互
- 锁定 → 解锁 → 手动编辑 → 智能停更
- 每步都有明确的视觉提示

## 技术实现

### 组件树
```
AdminUploadPage
  └─ Catalog ID Input Group
      ├─ Label: "Catalog ID"
      ├─ Toggle Button (Lock/Unlock)
      ├─ Input Field (readOnly conditional)
      ├─ Status Text
      └─ Breathing Glow (unlocked only)
```

### 样式要点
- 边框颜色: 锁定(金色) → 解锁(金色+光晕) → 偏离(红色)
- 文字颜色: 锁定(金色) → 解锁(白色)
- 光标: 锁定(禁止) → 解锁(文本)
- 光晕: 锁定(固定) → 解锁(呼吸动画)

---

**维护者**: Astra 馆长
**最后更新**: 2025-01-09
**版本**: v2.1 - 馆长最终解释权版
