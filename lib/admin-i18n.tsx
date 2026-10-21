'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type AdminLang = 'zh' | 'en';

const STORAGE_KEY = 'admin_lang';

/**
 * Admin UI dictionary. Each entry is [zh, en].
 * Missing keys fall back to the key itself (usually already readable English).
 */
const DICT: Record<string, [string, string]> = {
  // --- Sidebar / mobile nav ---
  'nav.workbench': ['项目工作台', 'Workbench'],
  'nav.projects': ['项目管理', 'Projects'],
  'nav.curation': ['策展', 'Curation'],
  'nav.drafts': ['草稿箱', 'Draft Inbox'],
  'nav.vault': ['图库资产', 'Asset Vault'],
  'nav.batches': ['批次记录', 'Batches'],
  'nav.chronicle': ['编年史', 'Chronicle'],
  'nav.editorial': ['杂志专栏', 'Editorial'],
  'nav.milestones': ['里程碑', 'Milestones'],
  'nav.contentFlow': ['内容流水线', 'Content Flow'],
  'nav.community': ['社区留言', 'Community'],
  'nav.messages': ['留言管理', 'Messages'],
  'nav.admin': ['后台管理', 'Admin Console'],
  'nav.logout': ['退出登录', 'Log Out'],
  'nav.collapse': ['收起侧栏', 'Collapse sidebar'],
  'nav.expand': ['展开侧栏', 'Expand sidebar'],
  'nav.langSwitch': ['EN', '中文'],
  'nav.settings': ['设置', 'Settings'],
  'nav.exitAdmin': ['退出后台', 'Exit admin'],

  // --- Layout / common ---
  'common.verifying': ['正在验证后台权限…', 'Verifying admin access...'],
  'common.back': ['返回', 'Back'],
  'common.loading': ['加载中…', 'Loading...'],
  'common.empty': ['暂无数据', 'Nothing here yet'],
  'common.all': ['全部', 'All'],
  'common.search': ['搜索', 'Search'],
  'common.confirm': ['确认', 'Confirm'],
  'common.cancel': ['取消', 'Cancel'],
  'common.save': ['保存', 'Save'],
  'common.delete': ['删除', 'Delete'],
  'common.edit': ['编辑', 'Edit'],
  'common.close': ['关闭', 'Close'],
  'common.saved': ['已保存', 'Saved'],
  'common.retry': ['重试', 'Retry'],
  'common.status': ['状态', 'Status'],
  'common.category': ['类别', 'Category'],
  'common.actions': ['操作', 'Actions'],
  'common.date': ['日期', 'Date'],
  'common.source': ['来源', 'Source'],
  'common.platform': ['平台', 'Platform'],
  'common.account': ['账号', 'Account'],
  'common.link': ['原帖链接', 'Source link'],
  'common.selectAll': ['全选', 'Select all'],
  'common.deselectAll': ['取消全选', 'Deselect all'],
  'common.selected': ['已选', 'Selected'],
  'common.images': ['张图片', 'images'],
  'common.noResults': ['没有匹配的结果', 'No matching results'],

  // --- Workbench (admin home) ---
  'wb.title': ['项目工作台', 'Project Workbench'],
  'wb.subtitle': ['以项目为中心管理全部图片', 'Manage everything around projects'],
  'wb.searchPlaceholder': ['搜索项目名称…', 'Search projects...'],
  'wb.filterAll': ['全部状态', 'All statuses'],
  'wb.entry.pending': ['待整理图片', 'Pending Images'],
  'wb.entry.pendingDesc': ['未归组 / 待补元数据的草稿', 'Ungrouped drafts and metadata to fill'],
  'wb.entry.batches': ['批次记录', 'Ingest Batches'],
  'wb.entry.batchesDesc': ['批量采集的成功 / 重复 / 失败', 'Batch collection results'],
  'wb.entry.vault': ['图库资产', 'Asset Vault'],
  'wb.entry.vaultDesc': ['全站图片总库', 'All-site image vault'],
  'wb.published': ['已发布', 'Published'],
  'wb.pending': ['待审核', 'Pending'],
  'wb.manage': ['管理项目', 'Manage'],
  'wb.legacyTools': ['其他内容工具', 'Other content tools'],
  'wb.totalProjects': ['个项目', 'projects'],

  // --- Status labels ---
  'status.published': ['已发布', 'PUBLISHED'],
  'status.candidate': ['候选', 'CANDIDATE'],
  'status.archived': ['已归档', 'ARCHIVED'],
  // Project form: 'theme' projects are subjects that recur across dates, so
  // they carry no single event date and get no point on the timeline.
  'status.theme': ['主题型', 'THEME'],
  'status.legacy': ['存量', 'LEGACY'],
  'status.available': ['可展示', 'AVAILABLE'],

  // --- Batches page ---
  'batch.title': ['批次记录', 'Ingest Batches'],
  'batch.subtitle': ['按采集批次查看成功、重复与失败', 'Collection results per batch'],
  'batch.col.id': ['批次 ID', 'Batch ID'],
  'batch.col.window': ['采集时间', 'Window'],
  'batch.col.total': ['总数', 'Total'],
  'batch.col.failed': ['失败', 'Failed'],
  'batch.col.assigned': ['已归组', 'Assigned'],
  'batch.col.ungrouped': ['未归组', 'Ungrouped'],
  'batch.col.source': ['来源账号', 'Source account'],
  'batch.review': ['去审核', 'Review'],
  'batch.empty': ['还没有批次记录', 'No batches yet'],

  // --- Draft inbox ---
  'd.title': ['草稿箱', 'Draft Inbox'],
  'd.subtitle': ['采集内容整理与审核', 'Content ingestion & curation'],
  'd.folders.title': ['项目文件夹', 'Project folders'],
  'd.folders.all': ['全部草稿', 'All drafts'],
  'd.folders.unassigned': ['未归属', 'Unassigned'],
  'd.folders.select': ['选择文件夹', 'Select a folder'],
  'd.folders.dropHint': ['松手归入此项目', 'Drop to file here'],
  'd.folders.dragHint': ['拖动缩略图到项目文件夹即可归类', 'Drag a thumbnail onto a project folder to file it'],
  'd.needProjectFirst': ['先关联项目', 'Link project first'],
  'd.searchPlaceholder': ['搜索标题 / 来源链接…', 'Search title / source URL...'],
  'd.status.all': ['全部', 'All'],
  'd.status.draft': ['待处理', 'Draft'],
  'd.status.ready': ['就绪', 'Ready'],
  'd.status.failed': ['失败', 'Failed'],
  'd.type.all': ['全部类型', 'All types'],
  'd.type.image': ['图片', 'Image'],
  'd.type.video': ['视频', 'Video'],
  'd.batchId': ['批次 ID', 'Batch ID'],
  'd.batchIdHint': ['按批次 ID 筛选，例如 b20261016-01', 'Filter by batch id, e.g. b20261016-01'],
  'd.projectId': ['项目 ID', 'Project ID'],
  'd.projectIdHint': ['按项目 ID 筛选（项目审核用）', 'Filter by project id (project review)'],
  'd.refresh': ['刷新', 'Refresh'],
  'd.refreshHint': ['刷新草稿箱', 'Refresh draft inbox'],
  'd.noMedia': ['无媒体', 'No media'],
  'd.featured': ['精选', 'Featured'],
  'd.publish': ['发布', 'Publish'],
  'd.unpublish': ['下线', 'Unpublish'],
  'd.projectLinked': ['已关联项目', 'Project linked'],
  'd.relink': ['改关联其他项目', 'Relink'],
  'd.waitingIngestion': ['暂无草稿，等待采集入库', 'No drafts yet, waiting for ingestion'],
  'd.deleteMany': ['批量删除', 'Delete multiple items'],
  'd.deleteOne': ['删除草稿', 'Delete item'],
  'd.deleteConfirmMany': ['确认删除这', 'Are you sure you want to delete these'],
  'd.deleteConfirmOne': ['确认删除这条草稿？此操作不可恢复。', 'Are you sure you want to delete this item? This action cannot be undone.'],
  // draft status / ingestion stage badges
  'db.draft': ['草稿', 'DRAFT'],
  'db.pending_review': ['待审核', 'REVIEW'],
  'db.ready': ['就绪', 'READY'],
  'db.published': ['已发布', 'PUBLISHED'],
  'db.rejected': ['已拒绝', 'REJECTED'],
  'db.pending': ['排队中', 'PENDING'],
  'db.downloading': ['下载中', 'DOWNLOADING'],
  'db.uploading': ['上传中', 'UPLOADING'],
  'db.translating': ['翻译中', 'TRANSLATING'],
  'db.failed': ['失败', 'FAILED'],
  'd.toGalleryAll': ['批量转正', 'To Gallery All'],
  'd.toGalleryAllHint': ['把选中草稿逐条转正为图库资产', 'Promote selected drafts into gallery assets one by one'],
  'd.batchPublish': ['批量发布', 'Batch Publish'],
  'd.batchDelete': ['批量删除', 'Batch Delete'],
  'd.batchEdit': ['批量编辑', 'Batch Edit'],
  'd.clearSelection': ['清除选择', 'Clear'],
  'd.unlinkProject': ['移出项目', 'Unlink Project'],
  'd.linkProject': ['关联项目', 'Link Project'],
  'd.createProject': ['创建项目', 'Create Project'],
  'd.addToAssets': ['加入图库', 'Add to Assets'],
  'd.setMilestone': ['设为里程碑', 'Set Milestone'],
  'd.noProject': ['未关联项目', 'No project'],
  'd.eventDate': ['事件日期', 'Event date'],
  'd.unknown': ['未知', 'Unknown'],

  // --- Project workspace (curate) ---
  'c.title': ['项目工作区', 'Project Workspace'],
  'c.backToList': ['返回项目列表', 'Back to projects'],
  'c.projectInfo': ['项目资料', 'Project Info'],
  'c.pendingSection': ['待审核图片', 'Pending Drafts'],
  'c.pendingHint': ['确认无误后勾选并批量转正；转正前不会对访客公开。', 'Select and promote when ready; drafts stay private until promoted.'],
  'c.publishedSection': ['已发布图片', 'Published Assets'],
  'c.publishedHint': ['拖动调整顺序，改动自动保存。', 'Drag to reorder; changes save automatically.'],
  'c.promote': ['批量转正', 'Promote Selected'],
  'c.unlink': ['移出项目', 'Unlink'],
  'c.cover': ['设为封面', 'Set Cover'],
  'c.isCover': ['当前封面', 'Cover'],
  'c.rotateLeft': ['左旋', 'Rotate Left'],
  'c.rotateRight': ['右旋', 'Rotate Right'],
  'c.remove': ['移除', 'Remove'],
  'c.dragHint': ['拖动排序', 'Drag to reorder'],
  'c.emptyPending': ['本项目暂无待审核图片', 'No pending drafts in this project'],
  'c.emptyPublished': ['本项目还没有已发布图片', 'No published assets yet'],
  'c.selectFirst': ['请先选择图片', 'Select images first'],
  'c.count': ['共', ''],
  'c.imagesUnit': ['张', ''],
  'c.untitled': ['未命名项目', 'Untitled Project'],
  'c.emptyPendingLong': ['本项目暂无待审核图片。未归组的采集图片在', 'No pending drafts in this project. Ungrouped collected images live in '],
  'c.emptyPendingHow': ['里，勾选后即可关联到本项目。', ' — select them there and link them to this project.'],
  'c.emptyPublishedHint': ['先转正上方待审核草稿，或在图库资产中转移图片。', 'Promote pending drafts above, or transfer assets from the Asset Vault.'],
  'c.autoSave': ['拖放后自动保存', 'Auto-saves on drop'],
  'c.clickSelect': ['点击草稿卡选中', 'Click drafts to select'],
  'c.unlinkHint': ['移出本项目（回到未归组）', 'Remove from this project (back to ungrouped)'],
  'c.missingMedia': ['媒体缺失', 'Missing media'],
  'd.unknownSource': ['来源未知', 'unknown source'],
  // curate inline save status (fixed strings)
  'ss.SAVING...': ['保存中…', 'SAVING...'],
  'ss.SAVED ✓': ['已保存 ✓', 'SAVED ✓'],
  'ss.ERROR ✗': ['出错 ✗', 'ERROR ✗'],
  'ss.ROTATING...': ['旋转中…', 'ROTATING...'],
  'ss.ROTATED': ['已旋转', 'Rotated'],
  'ss.ROTATE_ERROR': ['旋转出错', 'Rotate error'],
  'ss.DELETING...': ['删除中…', 'DELETING...'],
  'ss.DELETED': ['已删除', 'Deleted'],
  'ss.DELETE_ERROR': ['删除出错', 'Delete error'],
  'ss.SETTING_COVER...': ['设置封面中…', 'SETTING COVER...'],
  'ss.COVER_SET': ['封面已设置', 'Cover set'],
  'ss.COVER_ERROR': ['封面设置失败', 'Cover error'],
  'ss.PROMOTING...': ['转正中…', 'PROMOTING...'],
  'ss.PROMOTED': ['已转正', 'Promoted'],
  'ss.PROMOTE_ERROR': ['转正出错', 'Promote error'],
  'ss.ALREADY_IN_ASSETS': ['已在图库中', 'Already in assets'],
  'ss.UNLINKING...': ['移出中…', 'UNLINKING...'],
  'ss.UNLINKED': ['已移出', 'Unlinked'],
  'ss.UNLINK_ERROR': ['移出出错', 'Unlink error'],
  'ss.SKIPPED': ['跳过', 'Skipped'],
  'ss.FAILED': ['失败', 'Failed'],
  'ss.AUTH_REQUIRED': ['需要登录', 'Authentication required'],
  'ss.ERROR': ['出错', 'Error'],
  'ss.GALLERY_LOAD_FAILED': ['图库加载失败', 'Gallery load failed'],
  'ss.PROJECT_LOAD_FAILED': ['项目加载失败', 'Project load failed'],
  'ss.NETWORK_ERROR_WHILE_LOADING_PROJECT_GALLERY': ['网络错误，项目图片加载失败', 'Network error while loading project gallery'],
  'ss.SELECT_ALL': ['全选', 'Select all'],
  'ss.DESELECT_ALL': ['取消全选', 'Deselect all'],

  // --- Projects list ---
  'p.title': ['项目管理', 'Projects'],
  'p.viewAssets': ['查看图片', 'View Assets'],
  'p.viewLive': ['线上预览', 'View Live'],
  'p.merge': ['合并项目', 'Merge Project'],
  'p.split': ['拆分项目', 'Split Project'],
  'p.confirmDelete': ['确认从数据库删除该项目？此操作不可恢复。', 'Delete this project from the archive? This cannot be undone.'],
  'p.mergePrompt': ['合并到哪个项目？输入目标项目名称或 ID。', 'Merge into which project? Enter target title or ID.'],
  'p.splitPrompt': ['新项目名称？', 'New project title?'],
  'cat.MAGAZINE': ['杂志', 'Magazine'],
  'cat.EDITORIAL': ['专栏', 'Editorial'],
  'cat.JOURNAL': ['日志', 'Journal'],
  'cat.COMMERCIAL': ['广告', 'Commercial'],
  'cat.MUSIC_VIDEO': ['音乐录影带', 'Music Video'],
  'cat.TV_SERIES': ['剧集', 'TV Series'],
  'cat.APPEARANCE': ['活动', 'Appearance'],
  'cat.POST': ['帖子', 'Post'],
  'cat.EVENT': ['活动', 'Event'],
  'cat.FAN_MEETING': ['见面会', 'Fan Meeting'],
  'cat.UNCATEGORIZED': ['未分类', 'Uncategorized'],
  'cat.ALL': ['全部类别', 'All categories'],
  'p.projectTitle': ['项目名称', 'Project title'],
  'p.addNew': ['新建条目', 'Add new entry'],
  'p.initializeFirst': ['建立第一个项目档案', 'Initialize first record'],
  'p.searchLink': ['按项目名称、ID 或类别搜索', 'Search by project title, ID, or category'],
  'p.linkHint': ['为这条草稿选择一个已有项目，然后继续加入图库。', 'Select an existing project for this draft, then continue with WRITE_TO_ASSETS.'],

  // --- Project -> front-of-house entry link ---
  'pe.linkEntry': ['关联前台事件', 'File under entry'],
  'pe.title': ['把本项目归入一个前台事件', 'File this project under an entry'],
  'pe.picturesTotal': ['张图', 'pictures'],
  'pe.picturesUnassigned': ['张未关联', 'unfiled'],
  'pe.targetEntry': ['目标事件', 'Target entry'],
  'pe.selectPlaceholder': ['— 选择一个事件 —', '— Select an entry —'],
  'pe.noEntries': ['还没有前台事件', 'No entries exist yet'],
  'pe.entryHas': ['该事件现有', 'currently filed'],
  'pe.mode': ['关联方式', 'Filing mode'],
  'pe.modeUnassigned': ['只挂未关联的图', 'Only unfiled pictures'],
  'pe.modeUnassignedHint': ['已挂在其他事件下的图片保持不动，可重复执行。', 'Pictures already filed elsewhere stay put. Safe to repeat.'],
  'pe.modeAll': ['全部改挂到这个事件', 'Move every picture here'],
  'pe.modeAllHint': ['会覆盖项目内所有图片的归属，用来纠正挂错的事件。', 'Repoints every picture in the project. Use it to repair a wrong entry.'],
  'pe.confirmAll': ['这会把项目里的全部图片改挂到该事件，原本挂在别处的也会被移走。继续？', 'Every picture in this project will be moved to this entry, including ones filed elsewhere. Continue?'],
  'pe.submit': ['[ 关联并发布 ]', '[ FILE & PROCEED ]'],
  'pe.submitting': ['关联中…', 'Filing...'],
  'pe.done': ['张图片已归入', 'pictures filed under'],
  'pe.nothing': ['没有可关联的图片', 'Nothing left to file'],
  'pe.pickFirst': ['先选择目标事件', 'Pick an entry first'],
  'pe.linkFailed': ['关联失败', 'Filing failed'],

  // --- Upload ---
  'u.title': ['批量上传工作室', 'Upload'],
  'u.reminder': ['策展提醒：尊重每一位拍摄者的劳动。', "Curator's Reminder: Respect the shutter's effort."],
  'u.dropTitle': ['把图片拖到这里', 'Drag & Drop images here'],
  'u.dropSub': ['或点击选择文件', 'or click to browse'],
  'u.drop': ['拖拽图片到此处，或点击选择文件', 'Drop images here or click to choose files'],
  'u.project': ['关联项目', 'Link project'],
  'u.projectNone': ['不关联（进草稿箱）', 'None (goes to Draft Inbox)'],
  'u.tags': ['标签', 'Tags'],
  'u.eventDate': ['事件日期（可留空）', 'Event date (optional)'],
  'u.note': ['备注', 'Note'],
  'u.start': ['开始上传', 'Start upload'],
  'u.uploading': ['上传中…', 'Uploading...'],
  'u.success': ['成功', 'Success'],
  'u.duplicate': ['重复跳过', 'Duplicate'],
  'u.failed': ['失败', 'Failed'],
  'u.done': ['完成', 'Done'],

  // --- Toast messages ---
  't.PROJECT_RECORD_UPDATED': ['项目已更新', 'Project updated'],
  't.PROJECT_DELETED_FROM_ARCHIVE': ['项目已删除', 'Project deleted'],
  't.PROJECTS_MERGED': ['项目已合并', 'Projects merged'],
  't.PROJECT_SPLIT_CREATED': ['已拆分出新项目', 'Split project created'],
  't.PROJECT_CREATED': ['项目已创建', 'Project created'],
  't.PROJECT_LINKED': ['已关联项目', 'Project linked'],
  't.PROJECT_RELINKED': ['已重新关联项目', 'Project re-linked'],
  't.PROJECT_ALREADY_LINKED': ['该图片已关联项目', 'Already linked to a project'],
  't.TARGET_PROJECT_NOT_FOUND': ['未找到目标项目', 'Target project not found'],
  't.CANNOT_MERGE_INTO_SELF': ['不能合并到项目自身', 'Cannot merge into itself'],
  't.MERGE_FAILED': ['合并失败', 'Merge failed'],
  't.SPLIT_FAILED': ['拆分失败', 'Split failed'],
  't.MOVE_FAILED': ['移动失败', 'Move failed'],
  't.DROPPED_ON_ITSELF': ['已经在那个项目里了', 'Already in that project'],
  't.ASSET_ROTATION_UPDATED': ['图片方向已更新', 'Rotation updated'],
  't.ROTATED': ['已旋转', 'Rotated'],
  't.ROTATE_FAILED': ['旋转失败', 'Rotate failed'],
  't.ROTATE_ERROR': ['旋转出错', 'Rotate error'],
  't.COVER_SET': ['封面已设置', 'Cover set'],
  't.COVER_ERROR': ['封面设置失败', 'Cover error'],
  't.SET_COVER_FAILED': ['设置封面失败', 'Set cover failed'],
  't.DELETED': ['已删除', 'Deleted'],
  't.DELETE_FAILED': ['删除失败', 'Delete failed'],
  't.DELETE_ERROR': ['删除出错', 'Delete error'],
  't.DELETE_OPERATION_FAILED': ['删除操作失败', 'Delete failed'],
  't.ITEM_DELETED': ['已删除', 'Item deleted'],
  't.ITEM_PUBLISHED': ['已发布', 'Item published'],
  't.ITEM_UNPUBLISHED': ['已下线', 'Item unpublished'],
  't.ITEM_UPDATED': ['已更新', 'Item updated'],
  't.PUBLISH_FAILED': ['发布失败', 'Publish failed'],
  't.UNPUBLISH_FAILED': ['下线失败', 'Unpublish failed'],
  't.UPDATE_FAILED': ['更新失败', 'Update failed'],
  't.FETCH_FAILED': ['加载失败', 'Fetch failed'],
  't.PROJECT_LOAD_FAILED': ['项目加载失败', 'Project load failed'],
  't.GALLERY_LOAD_FAILED': ['图库加载失败', 'Gallery load failed'],
  't.NETWORK_ERROR_WHILE_LOADING_PROJECT_GALLERY': ['网络错误，项目图片加载失败', 'Network error while loading project gallery'],
  't.AUTH_REQUIRED': ['需要登录', 'Authentication required'],
  't.ADDED_TO_ASSETS': ['已加入图库', 'Added to assets'],
  't.ALREADY_IN_ASSETS': ['已在图库中', 'Already in assets'],
  't.ADD_TO_ASSETS_FAILED': ['加入图库失败', 'Add to assets failed'],
  't.PROMOTED': ['已转正', 'Promoted'],
  't.PROMOTE_FAILED': ['转正失败', 'Promote failed'],
  't.PROMOTE_ERROR': ['转正出错', 'Promote error'],
  't.UNLINKED': ['已移出项目', 'Unlinked'],
  't.UNLINK_FAILED': ['移出失败', 'Unlink failed'],
  't.UNLINK_ERROR': ['移出出错', 'Unlink error'],
  't.LINK_PROJECT_FAILED': ['关联项目失败', 'Link project failed'],
  't.CREATE_PROJECT_FAILED': ['创建项目失败', 'Create project failed'],
  't.SET_MILESTONE_FAILED': ['设置里程碑失败', 'Set milestone failed'],
  't.BATCH_PUBLISH_FAILED': ['批量发布失败', 'Batch publish failed'],
  't.BATCH_DELETE_FAILED': ['批量删除失败', 'Batch delete failed'],
  't.BATCH_UPDATE_SUCCESS': ['批量更新成功', 'Batch update success'],
  't.BATCH_UPDATE_FAILED': ['批量更新失败', 'Batch update failed'],
  't.TRANSLATION_SUCCESS': ['翻译完成', 'Translation done'],
  't.TRANSLATION_FAILED': ['翻译失败', 'Translation failed'],
  't.NO_ENG_CONTENT': ['暂无英文内容', 'No English content'],

  // --- Admin login page ---
  'login.title': ['后台入口', 'Admin Portal'],
  'login.subtitle': ['输入凭据进入策展工作台', 'Enter your credentials to access the curator dashboard'],
  'login.email': ['邮箱地址', 'Email Address'],
  'login.password': ['密码', 'Password'],
  'login.submit': ['进入后台', 'Sign In to Admin Portal'],
  'login.signingIn': ['登录中…', 'Signing in...'],
  'login.entering': ['正在进入轨道…', 'Entering Orbit...'],
  'login.failed': ['登录失败，请检查凭据。', 'Failed to sign in. Please check your credentials.'],
  'login.back': ['返回网站', 'Back to Website'],
  'login.protected': ['由 Supabase 身份验证保护', 'Protected by Supabase Authentication'],
  'login.langLabel': ['语言', 'Language'],
};

interface AdminLangContextValue {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  /** Translate a dictionary key; falls back to the key itself. */
  t: (key: string) => string;
}

const AdminLangContext = createContext<AdminLangContextValue>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
});

export function AdminLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>('zh');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = DICT[key];
      if (!entry) return key;
      return lang === 'zh' ? entry[0] : entry[1];
    },
    [lang]
  );

  return (
    <AdminLangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </AdminLangContext.Provider>
  );
}

export function useAdminLang() {
  return useContext(AdminLangContext);
}
