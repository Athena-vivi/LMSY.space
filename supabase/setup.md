# Supabase 数据库设置指南

## 方法一：通过 Dashboard（推荐新手）

### 1. 创建项目
1. 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - Project name: `lmsy-fan-site`
   - Database Password: （设置一个强密码）
   - Region: 选择离你最近的区域（如 Singapore）

### 2. 执行 Schema SQL

1. 在项目 Dashboard 中，点击左侧菜单的 **SQL Editor**
2. 点击 **New query**
3. 复制 `schema.sql` 文件的全部内容
4. 粘贴到编辑器中
5. 点击 **Run** 按钮

### 3. 配置存储（Storage）

在左侧菜单点击 **Storage**，创建以下公开存储桶：

| Bucket 名称 | 用途 | Public |
|------------|------|--------|
| `avatars` | 成员头像 | ✅ 是 |
| `project-covers` | 项目封面 | ✅ 是 |
| `gallery` | 相册图片 | ✅ 是 |
| `assets` | 其他资源 | ✅ 是 |

创建步骤：
1. 点击 "Create a new bucket"
2. 输入名称
3. 勾选 "Public bucket"
4. 点击 "Create bucket"

### 4. 获取 API 密钥

1. 点击左侧菜单的 **Project Settings** → **API**
2. 复制以下信息：
   - `Project URL`
   - `anon public` key

### 5. 配置本地环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon密钥
```

---

## 方法二：通过 Supabase CLI

### 安装 CLI
```bash
npm install -g supabase
```

### 链接项目
```bash
supabase link --project-ref 你的项目ID
```

### 推送 Schema
```bash
supabase db push
```

---

## 插入示例数据（可选）

在 SQL Editor 中执行：

```sql
-- 插入成员数据
INSERT INTO members (name, nickname, birthday, height, bio, ig_handle, x_handle, weibo_handle, xhs_handle) VALUES
('Lookmhee', 'Lookmhee', '2003-05-15', '165cm', 'Thai actress known for her role in Affair', '@lookmhee', '@lookmhee_official', '@lookmhee_weibo', '@lookmhee_xhs'),
('Sonya', 'Sonya', '2003-08-22', '168cm', 'Thai actress known for her role in Affair', '@sonya', '@sonya_official', '@sonya_weibo', '@sonya_xhs');

-- 插入项目数据
INSERT INTO projects (title, category, release_date, description, watch_url) VALUES
('Affair', 'series', '2024-01-15', 'A compelling Thai GL series', '#'),
('The Promise', 'series', '2023-08-20', 'A heartfelt drama', '#'),
('VOGUE Thailand', 'magazine', '2024-03-01', 'Exclusive fashion spread', '#');

-- 插入日程数据
INSERT INTO schedule (title, event_date, location, link) VALUES
('Fan Meet Bangkok', '2025-01-20T14:00:00', 'Siam Paragon, Bangkok', '#'),
('Affair Season 2 Premiere', '2025-02-14T19:00:00', 'SF World Cinema, Bangkok', '#');
```

---

## 验证设置

在 SQL Editor 中运行：
```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 检查数据
SELECT * FROM members;
SELECT * FROM projects;
SELECT * FROM gallery;
SELECT * FROM schedule;
```
