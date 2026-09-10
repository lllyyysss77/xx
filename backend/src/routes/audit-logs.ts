/**
 * ── 经办人履职留痕与防旷工查证模块 ──
 * 甲方查验经办人出勤履职、防旷工不可篡改日志流水与统计
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, roleGuard, orgScope, parsePagination } from '../lib';

// ============================================================
// [TAG-INDEX] audit-logs.ts — 操作审计日志查询
// [CORE-FLOW] GET /admin/audit-logs — 审计日志列表（分页/筛选/导出）
// [CORE-FLOW] GET /admin/audit-logs/summary — 按日/经办人汇总（防旷工履职留痕统计）
// [TODO-FIX P2] summary gapDays 用服务器本地时区与 min/max UTC 混用
// ============================================================
export async function auditLogsRoutes(app: FastifyInstance) {
  // 查询履职留痕流水（超管可查全部，村居负责人可查本村经办人）
  app.get('/admin/audit-logs', { preHandler: staff }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const q = z.object({
      organizationId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      actionType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);

    const isPlatform = req.auth!.role === 'platform_admin';
    const scopeOrg = isPlatform ? q.organizationId : req.auth!.organizationId;

    const pg = parsePagination(q);
    const conditions: string[] = [];
    const params: any[] = [];

    if (scopeOrg) {
      params.push(scopeOrg);
      conditions.push(`l.organization_id = $${params.length}`);
    }
    if (q.userId) {
      params.push(q.userId);
      conditions.push(`l.user_id = $${params.length}`);
    }
    if (q.actionType) {
      params.push(q.actionType);
      conditions.push(`l.action_type = $${params.length}`);
    }
    if (q.startDate) {
      params.push(q.startDate);
      conditions.push(`l.created_at >= $${params.length}::timestamptz`);
    }
    if (q.endDate) {
      params.push(q.endDate);
      conditions.push(`l.created_at <= ($${params.length}::timestamptz + interval '1 day')`);
    }

    const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

    const sql = `
      select l.id, l.organization_id as "organizationId", o.name as "organizationName",
             l.election_fief_id as "electionFiefId", l.user_id as "userId",
             l.user_name as "userName", l.phone, l.role, l.action_type as "actionType",
             l.action_title as "actionTitle", l.details, l.client_ip as "clientIp",
             l.created_at as "createdAt"
      from operation_audit_logs l
      left join organizations o on o.id = l.organization_id
      ${whereClause}
      order by l.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
    `;

    const countSql = `
      select count(*)::int as total
      from operation_audit_logs l
      ${whereClause}
    `;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(sql, [...params, pg.limit, pg.offset]),
      pool.query(countSql, params),
    ]);

    const items = rowsRes.rows;
    const total = countRes.rows[0]?.total ?? 0;

    if (!pg.paginated) return items;
    return { items, total, page: pg.page, pageSize: pg.pageSize };
  });

  // 经办人在岗履职考勤防旷工统计摘要
  app.get('/admin/audit-logs/stats', { preHandler: staff }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const isPlatform = req.auth!.role === 'platform_admin';
    const q = z.object({
      organizationId: z.string().uuid().optional(),
    }).parse(req.query);

    const scopeOrg = isPlatform ? q.organizationId : req.auth!.organizationId;
    const params: any[] = [];
    let orgFilter = '';
    if (scopeOrg) {
      params.push(scopeOrg);
      orgFilter = `where l.organization_id = $1`;
    }

    // 统计：经办人员打卡操作天数、总操作次数、最早履职时间、最近履职时间
    const sql = `
      select l.user_id as "userId",
             l.user_name as "userName",
             l.phone,
             l.role,
             coalesce(o.name, '全区/未归属') as "organizationName",
             count(distinct to_char(l.created_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD')) as "activeDays",
             count(*) as "totalActions",
             min(l.created_at) as "firstActiveAt",
             max(l.created_at) as "lastActiveAt"
      from operation_audit_logs l
      left join organizations o on o.id = l.organization_id
      ${orgFilter}
      group by l.user_id, l.user_name, l.phone, l.role, o.name
      order by "lastActiveAt" desc
    `;

    const rows = (await pool.query(sql, params)).rows;
    return rows;
  });

  // 经办人在岗履职考勤防旷工汇总与断档旷工预警
  app.get('/admin/audit-logs/summary', { preHandler: staff }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const isPlatform = req.auth!.role === 'platform_admin';
    const q = z.object({
      organizationId: z.string().uuid().optional(),
    }).parse(req.query);

    const scopeOrg = isPlatform ? q.organizationId : req.auth!.organizationId;
    const params: any[] = [];
    let orgFilter = '';
    if (scopeOrg) {
      params.push(scopeOrg);
      orgFilter = `where l.organization_id = $1`;
    }

    const sql = `
      select l.user_id as "userId",
             coalesce(max(l.user_name), '经办人') as "userName",
             coalesce(max(l.phone), '') as "phone",
             max(l.role) as "role",
             coalesce(max(o.name), '全区/未归属') as "organizationName",
             count(*)::int as "totalActions",
             count(distinct (l.created_at at time zone 'Asia/Shanghai')::date)::int as "activeDutyDays",
             max(l.created_at) as "lastDutyAt",
             min(l.created_at) as "firstDutyAt"
      from operation_audit_logs l
      left join organizations o on o.id = l.organization_id
      ${orgFilter}
      group by l.user_id
      order by "lastDutyAt" desc nulls last
    `;

    const userStats = (await pool.query(sql, params)).rows;
    const now = Date.now();
    const evaluated = userStats.map((u: any) => {
      const last = u.lastDutyAt ? new Date(u.lastDutyAt).getTime() : 0;
      const gapDays = last > 0 ? Math.floor((now - last) / (1000 * 60 * 60 * 24)) : 999;
      let alertLevel = 'normal';
      let alertMsg = '在岗履职正常';
      if (gapDays >= 3) {
        alertLevel = 'critical';
        alertMsg = `严重预警：已连续 ${gapDays} 天无履职记录（疑似旷工）`;
      } else if (gapDays >= 1) {
        alertLevel = 'warning';
        alertMsg = `提示：距上次操作已过去 ${gapDays} 天`;
      }
      return {
        ...u,
        gapDays,
        alertLevel,
        alertMsg,
      };
    });

    const totalDutyLogs = Number(
      (await pool.query(`select count(*)::int as c from operation_audit_logs l ${orgFilter}`, params)).rows[0]?.c || 0
    );

    return {
      organizationId: scopeOrg ?? 'all',
      totalDutyLogs,
      staffCount: evaluated.length,
      warningCount: evaluated.filter((x: any) => x.alertLevel !== 'normal').length,
      users: evaluated,
    };
  });
}

