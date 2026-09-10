/**
 * ── 附件模块：统一上传 / 下载 ──
 * 材料/提案/公告共用；上传返回 storageKey → 各业务表存 metadata，下载按 key 匿名可读（32hex 不可猜）。
 * 物理落盘按归档目录结构：uploads/{归属地名}/{届名|未分类}/{sourceType|other}/{key}
 */
import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { auth, UPLOAD_DIR, MIME_BY_EXT, saveUploadPart } from '../lib';

/** 内存高速路径缓存（key -> absolutePath），避免每次下载全目录 DFS */
const fileLocationCache = new Map<string, string>();

/** 记录文件物理绝对路径到缓存 */
export function cacheFilePath(key: string, fullPath: string) {
  if (fileLocationCache.size > 10000) {
    const firstKey = fileLocationCache.keys().next().value;
    if (firstKey) fileLocationCache.delete(firstKey);
  }
  fileLocationCache.set(key, fullPath);
}

/** 在 UPLOAD_DIR 下递归找名为 key 的文件（优先读缓存，未命中再遍历） */
async function findFileByKey(key: string): Promise<string | null> {
  // 1. 命中内存缓存且文件真实存在
  const cached = fileLocationCache.get(key);
  if (cached) {
    try {
      const st = await fsp.stat(cached);
      if (st.isFile()) return cached;
    } catch {
      fileLocationCache.delete(key);
    }
  }

  // 2. 根目录老平铺优先命中（常见场景）
  const flatPath = join(UPLOAD_DIR, key);
  try {
    const st = await fsp.stat(flatPath);
    if (st.isFile()) {
      cacheFilePath(key, flatPath);
      return flatPath;
    }
  } catch {}

  // 3. 递归遍历归档目录结构
  const stack = [UPLOAD_DIR];
  while (stack.length) {
    const dir = stack.pop()!;
    let ents: import('node:fs').Dirent[];
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        // 顺带缓存遇到的文件，加速批次下载
        cacheFilePath(e.name, full);
        if (e.name === key) return full;
      }
    }
  }
  return null;
}

// ============================================================
// [TAG-INDEX] files.ts — 附件统一上传/下载
// [DATA-LAYER]   POST /files/upload — 统一附件上传（saveUploadPart 唯一收口，物理路径 uploads/{org}/{term}/{type}/{32hex}）
// [ROUTE-CORE]   GET /files/:key — 附件下载（匿名可读，32hex storageKey 不可猜）
// [TODO-FIX P1-4] GET /files/:key 无鉴权，候选人身份证等敏感材料持 URL 即可下载，需产品确认是否加 token 校验
// ============================================================
export async function fileRoutes(app: FastifyInstance) {
  // 统一上传：落盘收口到 lib.saveUploadPart，返回 storageKey，由调用方写入各自业务 *_files 表
  app.post('/files/upload', { preHandler: auth }, async (req, rep) => {
    const part = await req.file();
    if (!part) return rep.code(400).send({ error: 'no_file' });
    const fiefId = String((part.fields as Record<string, { value: string }> | undefined)?.electionFiefId?.value || '').trim();
    const sourceType = String((part.fields as Record<string, { value: string }> | undefined)?.sourceType?.value || 'other');
    const meta = await saveUploadPart(part, { orgId: req.auth!.organizationId, fiefId: fiefId || null, sourceType });
    // 上传成功立即写入缓存，后续预览下载零耗时
    if (meta.storageKey && meta.relPath) {
      cacheFilePath(meta.storageKey, join(UPLOAD_DIR, meta.relPath, meta.storageKey));
    }
    return meta;
  });

  app.get('/files/:key', async (req, rep) => {
    const key = String((req.params as { key: string }).key);
    if (!/^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/.test(key)) return rep.code(400).send({ error: 'invalid_key' });
    // 先找归档路径（优先命中内存缓存），再回退老平铺
    let p = await findFileByKey(key);
    if (!p) p = join(UPLOAD_DIR, key);
    const ext = key.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] || '';
    try {
      const st = await fsp.stat(p);
      if (!st.isFile()) return rep.code(404).send({ error: 'not_found' });
      return rep
        .header('Content-Type', MIME_BY_EXT[ext.toLowerCase()] || 'application/octet-stream')
        .header('Content-Length', st.size)
        .send(createReadStream(p));
    } catch { return rep.code(404).send({ error: 'not_found' }); }
  });
}
