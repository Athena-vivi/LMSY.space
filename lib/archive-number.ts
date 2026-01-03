/**
 * 生成馆藏编号系统
 * 格式: LMSY-{TYPE}-{YEAR}-{XXX}
 * 例如: LMSY-G-2024-001
 */

export type ArchiveType = 'G' | 'P' | 'S'; // Gallery, Project, Schedule

export interface ArchiveNumberConfig {
  type: ArchiveType;
  year?: number;
  sequence?: number;
}

/**
 * 生成馆藏编号
 */
export function generateArchiveNumber(config: ArchiveNumberConfig): string {
  const { type, year, sequence } = config;

  // 默认使用当前年份
  const archiveYear = year || new Date().getFullYear();

  // 序列号，默认为 001
  const archiveSequence = sequence ? String(sequence).padStart(3, '0') : '001';

  return `LMSY-${type}-${archiveYear}-${archiveSequence}`;
}

/**
 * 解析馆藏编号
 */
export function parseArchiveNumber(archiveNumber: string): {
  prefix: string;
  type: ArchiveType;
  year: number;
  sequence: number;
} | null {
  const regex = /^LMSY-([GPS])-(\d{4})-(\d{3})$/;
  const match = archiveNumber.match(regex);

  if (!match) return null;

  return {
    prefix: 'LMSY',
    type: match[1] as ArchiveType,
    year: parseInt(match[2]),
    sequence: parseInt(match[3]),
  };
}

/**
 * 获取下一个序列号
 * 需要从数据库查询当年已有的最大序列号
 */
export async function getNextSequenceNumber(
  type: ArchiveType,
  year: number
): Promise<number> {
  // 这里需要连接到数据库查询
  // 暂时返回 1，实际使用时需要从 Supabase 查询
  // const { data } = await supabase
  //   .from('gallery')
  //   .select('archive_number')
  //   .like('archive_number', `LMSY-${type}-${year}-%`)
  //   .order('archive_number', { ascending: false })
  //   .limit(1);

  // if (data && data.length > 0) {
  //   const parsed = parseArchiveNumber(data[0].archive_number);
  //   return parsed ? parsed.sequence + 1 : 1;
  // }

  return 1;
}

/**
 * 根据类型获取类型名称
 */
export function getTypeName(type: ArchiveType): string {
  switch (type) {
    case 'G':
      return 'Gallery';
    case 'P':
      return 'Project';
    case 'S':
      return 'Schedule';
    default:
      return 'Unknown';
  }
}

/**
 * 获取类型对应的颜色类名
 */
export function getTypeColorClass(type: ArchiveType): string {
  switch (type) {
    case 'G':
      return 'text-lmsy-yellow border-lmsy-yellow';
    case 'P':
      return 'text-lmsy-blue border-lmsy-blue';
    case 'S':
      return 'text-foreground border-foreground';
    default:
      return 'text-muted-foreground border-muted-foreground';
  }
}
