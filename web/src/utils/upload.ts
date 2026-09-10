/**
 * 统一上传约束与校验（全站唯一收口）
 * - 上传格式白名单：与后端 files.ts 的 MIME_BY_EXT 保持一致（后端同样强制校验，双保险）
 * - 大小上限：20MB（与后端 @fastify/multipart limits 一致）
 * - 前端所有 <input type="file"> 必须设置 accept={UPLOAD_ACCEPT} 并调用 validateUploadFile
 */
export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip,.txt';

/** 格式中文说明（用于界面提示/报错文案） */
export const UPLOAD_ACCEPT_LABEL = '支持 PDF、Word、Excel、JPG/PNG 图片、ZIP、TXT，单个不超过 20MB';

export const UPLOAD_MAX_SIZE = 20 * 1024 * 1024;

/** 后端允许的扩展名集合（与 lib.ts MIME_BY_EXT 对齐） */
const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'txt'];

export interface UploadCheckResult {
  ok: boolean;
  /** 不通过时的用户提示 */
  message?: string;
}

/** 单文件校验：扩展名 + 大小。失败返回具体原因，成功返回 ok:true */
export function validateUploadFile(file: File): UploadCheckResult {
  const name = file?.name || '';
  const m = name.match(/\.([a-zA-Z0-9]{1,10})$/);
  const ext = m ? m[1].toLowerCase() : '';
  if (!ext || !ALLOWED_EXTS.includes(ext)) {
    return { ok: false, message: `「${name}」格式不支持。${UPLOAD_ACCEPT_LABEL}` };
  }
  if (file.size > UPLOAD_MAX_SIZE) {
    return { ok: false, message: `「${name}」超过 20MB 上限，请压缩后重新上传` };
  }
  if (file.size === 0) {
    return { ok: false, message: `「${name}」是空文件，请检查后重新上传` };
  }
  return { ok: true };
}

/** 批量校验：返回第一个不通过项的提示；全部通过返回 null */
export function validateUploadFiles(files: File[]): UploadCheckResult {
  for (const f of files) {
    const r = validateUploadFile(f);
    if (!r.ok) return r;
  }
  return { ok: true };
}
