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

/** 在 UPLOAD_DIR 下递归找名为 key 的文件（归档目录结构后兼容老平铺） */
async function findFileByKey(key: string): Promise<string | null> {
  const stack = [UPLOAD_DIR];
  while (stack.length) {
    const dir = stack.pop()!;
    let ents: import('node:fs').Dirent[];
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name === key) return full;
    }
  }
  return null;
}

export async function fileRoutes(app: FastifyInstance) {
  // 统一上传：落盘收口到 lib.saveUploadPart，返回 storageKey，由调用方写入各自业务 *_files 表
  app.post('/files/upload', { preHandler: auth }, async (req, rep) => {
    const part = await req.file();
    if (!part) return rep.code(400).send({ error: 'no_file' });
    const fiefId = String((part.fields as Record<string, { value: string }> | undefined)?.electionFiefId?.value || '').trim();
    const sourceType = String((part.fields as Record<string, { value: string }> | undefined)?.sourceType?.value || 'other');
    const meta = await saveUploadPart(part, { orgId: req.auth!.organizationId, fiefId: fiefId || null, sourceType });
    return meta;
  });

  app.get('/files/:key', async (req, rep) => {
    const key = String((req.params as { key: string }).key);
    if (!/^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/.test(key)) return rep.code(400).send({ error: 'invalid_key' });
    // 先找归档路径（子目录），再回退老平铺
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
