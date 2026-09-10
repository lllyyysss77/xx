/**
 * ── 业务附件模块（提案 / 公告 / 岗位）──
 * 架构遵循 files.ts 原始设计：统一落盘（lib.saveUploadPart）→ 各业务自己的 *_files 强外键表存 metadata。
 * 三类封地各一张明确附件表（proposal_files / announcement_files / position_files，结构复刻 material_files），
 * 本文件用一个工厂循环注册，逻辑只写一遍（模块化复用，不复制三遍；不使用多态黑盒表）。
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, orgScope, saveUploadPart, UPLOAD_DIR, logDutyAction } from '../lib';
import { cacheFilePath } from './files';
import { join } from 'node:path';

interface BizCfg {
  route: string;            // URL 段
  table: string;            // 该封地附件表（写死常量，非用户输入，无注入风险）
  fkCol: string;            // 附件表指向主表的外键列
  ownerSql: string;         // 由主表 id 查归属 org（及 fief，用于归档目录）
  sourceType: string;       // uploads 落盘来源目录名
}

const CFG: BizCfg[] = [
  {
    route: 'proposals', table: 'proposal_files', fkCol: 'proposal_id', sourceType: 'proposal',
    ownerSql: "select organization_id as org, null as fief from election_proposals where id=$1",
  },
  {
    route: 'announcements', table: 'announcement_files', fkCol: 'announcement_id', sourceType: 'announcement',
    ownerSql: 'select f.organization_id as org, a.election_fief_id as fief from announcements a join election_fiefs f on f.id=a.election_fief_id where a.id=$1',
  },
  {
    route: 'positions', table: 'position_files', fkCol: 'position_id', sourceType: 'position',
    ownerSql: 'select f.organization_id as org, p.election_fief_id as fief from positions p join election_fiefs f on f.id=p.election_fief_id where p.id=$1',
  },
];

// ============================================================
// [TAG-INDEX] biz-files.ts — 业务附件工厂（公告/岗位/提案/材料附件的统一 CRUD）
// [DATA-LAYER] 工厂模式：buildBizFileRoutes(bizName, table, fkColumn) 生成统一的附件增删查
// [ROUTE-CORE] /admin/announcements/:id/files — 公告附件
// [ROUTE-CORE] /admin/positions/:id/files — 岗位附件
// [ROUTE-CORE] /admin/proposals/:id/files — 提案附件
// [ROUTE-CORE] /admin/materials/:id/files — 材料附件
// ============================================================
export async function bizFileRoutes(app: FastifyInstance) {
  for (const cfg of CFG) {
    // 归属校验：取主记录归属地，跨归属地直接 403（防串台）
    const ownerOf = async (id: string) => (await pool!.query(cfg.ownerSql, [id])).rows[0] as { org: string; fief: string | null } | undefined;

    // 上传：multipart 直传 → 统一落盘 → 写本封地附件表
    app.post(`/admin/${cfg.route}/:id/file`, { preHandler: staff }, async (req, rep) => {
      const id = z.string().uuid().parse((req.params as { id: string }).id);
      const owner = await ownerOf(id);
      if (!owner) return rep.code(404).send({ error: 'not_found' });
      if (!orgScope(owner.org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
      const part = await req.file();
      if (!part) return rep.code(400).send({ error: 'no_file' });
      const meta = await saveUploadPart(part, { orgId: owner.org, fiefId: owner.fief, sourceType: cfg.sourceType });
      if (meta.storageKey && meta.relPath) {
        cacheFilePath(meta.storageKey, join(UPLOAD_DIR, meta.relPath, meta.storageKey));
      }
      const row = (await pool!.query(
        `insert into ${cfg.table}(${cfg.fkCol},file_name,mime_type,size_bytes,storage_key,created_by)
         values($1,$2,$3,$4,$5,$6) returning *`,
        [id, meta.fileName, meta.mimeType, meta.sizeBytes, meta.storageKey, req.auth!.userId],
      )).rows[0];
      void logDutyAction({
        userId: req.auth!.userId,
        organizationId: owner.org,
        electionFiefId: owner.fief,
        actionType: `${cfg.route}_file_upload`,
        actionTitle: `上传${cfg.route}附件《${meta.fileName}》`,
        details: { targetId: id, fileName: meta.fileName, sizeBytes: meta.sizeBytes },
        clientIp: req.ip,
      });
      return rep.code(201).send(row);
    });

    // 附件列表
    app.get(`/admin/${cfg.route}/:id/files`, { preHandler: staff }, async (req, rep) => {
      const id = z.string().uuid().parse((req.params as { id: string }).id);
      const owner = await ownerOf(id);
      if (!owner) return rep.code(404).send({ error: 'not_found' });
      if (!orgScope(owner.org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
      const rows = await pool!.query(
        `select id,file_name as "fileName",mime_type as "mimeType",size_bytes as "sizeBytes",
                storage_key as "storageKey",created_at as "createdAt"
         from ${cfg.table} where ${cfg.fkCol}=$1 order by created_at`, [id]);
      return rows.rows;
    });

    // 删除附件记录（归属校验；只删子表元数据，磁盘文件保留于归档目录留痕）
    app.delete(`/admin/${cfg.route}/:id/file/:fileId`, { preHandler: staff }, async (req, rep) => {
      const { id, fileId } = req.params as { id: string; fileId: string };
      z.string().uuid().parse(id);
      z.string().uuid().parse(fileId);
      const owner = await ownerOf(id);
      if (!owner) return rep.code(404).send({ error: 'not_found' });
      if (!orgScope(owner.org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
      const del = await pool!.query(
        `delete from ${cfg.table} where id=$1 and ${cfg.fkCol}=$2 returning id`,
        [fileId, id],
      );
      if (!del.rowCount) return rep.code(404).send({ error: 'file_not_found' });
      return { deleted: true };
    });
  }
}
