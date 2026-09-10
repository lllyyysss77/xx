-- 2026-09-05 P1: 补齐公告小编工作台编辑态字段（20号对账清单 决策项B）
-- 前端 Notice 字段 -> 列；/api/announcements 以驼峰别名返回供 liveSync 回显
alter table announcements
  add column if not exists ann_sign                text,                        -- 落款单位
  add column if not exists ann_sign_date           text,                        -- 成文日期
  add column if not exists ann_open_material_submit boolean not null default false, -- 开放参选人材料提交入口
  add column if not exists ann_publish_mode        text not null default 'immediate'
        check (ann_publish_mode in ('immediate','scheduled')),                  -- 发布方式 立即/定时
  add column if not exists ann_publish_at          timestamptz,                 -- 定时发布时间
  add column if not exists ann_remind_hours        int  not null default 24,    -- 提前提醒小时
  add column if not exists ann_remind_to           text not null default 'editor,admin'; -- 提醒对象 逗号分隔 editor/admin
