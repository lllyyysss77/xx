import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Tree,
  Button,
  Tag,
  Space,
  Input,
  MessagePlugin,
  Dialog,
  Empty,
  Loading,
} from 'tdesign-react';
import {
  FolderIcon,
  FileIcon,
  DownloadIcon,
  SearchIcon,
  RefreshIcon,
} from 'tdesign-icons-react';
import { getArchives, ArchiveItem } from '../../api/archives';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { getFileUrl, formatFileSize } from '../../api/files';

interface TreeNode {
  label: React.ReactNode;
  value: string;
  children?: TreeNode[];
  item?: ArchiveItem;
}

const SOURCE_META: Record<string, { label: string; theme: 'primary' | 'warning' | 'success' | 'default' }> = {
  proposal: { label: '提案方案', theme: 'primary' },
  position: { label: '岗位文件', theme: 'default' },
  announcement: { label: '法定公文', theme: 'warning' },
  material: { label: '参选材料', theme: 'success' },
};

export default function ArchivesPage() {
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [detail, setDetail] = useState<ArchiveItem | null>(null);

  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fiefData, arcData] = await Promise.all([
        getElectionFiefs(),
        getArchives(),
      ]);
      setFiefs(fiefData);
      setArchives(arcData || []);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载归档文件失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // fiefId → 届次信息
  const fiefMap = useMemo(() => {
    const m = new Map<string, ElectionFief>();
    fiefs.forEach((f) => m.set(f.id, f));
    return m;
  }, [fiefs]);

  // 真实数据 → 树：根 → 届 → 来源类型 → 归档项
  const treeData = useMemo<TreeNode[]>(() => {
    const byFief = new Map<string, ArchiveItem[]>();
    archives.forEach((it) => {
      const k = it.electionFiefId || 'unknown';
      if (!byFief.has(k)) byFief.set(k, []);
      byFief.get(k)!.push(it);
    });

    const fiefNodes: TreeNode[] = [];
    byFief.forEach((items, fiefId) => {
      const fief = fiefMap.get(fiefId);
      // 届内按来源类型二级分组
      const byType = new Map<string, ArchiveItem[]>();
      items.forEach((it) => {
        const t = it.sourceType || 'other';
        if (!byType.has(t)) byType.set(t, []);
        byType.get(t)!.push(it);
      });

      const typeNodes: TreeNode[] = [];
      byType.forEach((rows, type) => {
        const meta = SOURCE_META[type] || { label: type || '其他', theme: 'default' as const };
        typeNodes.push({
          label: (
            <span>
              <Tag theme={meta.theme} variant="light" size="small">{meta.label}</Tag>
              <span style={{ marginLeft: 8, color: '#86909C' }}>{rows.length} 项</span>
            </span>
          ),
          value: `${fiefId}-${type}`,
          children: rows.map((r) => ({
            label: <span>📄 {r.fileName || '未命名归档项'}</span>,
            value: r.id,
            item: r,
          })),
        });
      });

      fiefNodes.push({
        label: (
          <span>
            📁 {fief?.termName || fief?.name || fiefId}
            <span style={{ marginLeft: 8, color: '#86909C', fontSize: 12 }}>
              D日 {fief?.dDay || '未定'}
            </span>
          </span>
        ),
        value: `fief-${fiefId}`,
        children: typeNodes,
      });
    });

    return [
      {
        label: (
          <span style={{ fontWeight: 600 }}>
            🗂️ 选举归档（共 {archives.length} 项 · {byFief.size} 届）
          </span>
        ),
        value: 'root',
        children: fiefNodes,
      },
    ];
  }, [archives, fiefMap]);

  // 点击树节点：如果是归档项则打开详情
  const handleTreeClick = (context: any) => {
    const d = context?.node?.data as TreeNode;
    if (d?.item) {
      setDetail(d.item);
    }
  };

  // 文件下载（非法 key 防御：不满足 32 位 hex 规则不触发，避免 400）
  const handleDownload = (item: ArchiveItem) => {
    if (!item.storageKey || !/^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/.test(item.storageKey)) return;
    const url = getFileUrl(item.storageKey);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 搜索过滤后的列表（右侧表格）
  const filteredList = useMemo(
    () =>
      archives.filter((item) => {
        if (!searchKey) return true;
        const kw = searchKey.toLowerCase();
        return (
          item.fileName.toLowerCase().includes(kw) ||
          item.sourceName.toLowerCase().includes(kw)
        );
      }),
    [archives, searchKey],
  );

  const detailFief = detail ? fiefMap.get(detail.electionFiefId || '') : null;

  return (
    <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
      <Card
        title="历史法律材料全链归档树"
        description="所有往来附件材料在服务器按「归属地 - 届次 - 换届活动 - 业务分类 - 岗位/人名」物理落盘隔离。本档案树为全周期法案追溯提供依据。"
        actions={
          <Button theme="default" variant="outline" size="small" icon={<RefreshIcon />} onClick={loadData}>
            刷新
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* 左侧：真实 Tree 组件 */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 6, minHeight: 600 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderIcon style={{ color: '#0052d9' }} />
              <span>服务器归档目录结构</span>
            </div>
            {loading ? (
              <Loading text="加载归档台账…" />
            ) : archives.length === 0 ? (
              <Empty description="暂无归档记录（提案通过并推进后自动产生）" />
            ) : (
              <Tree
                data={treeData as unknown as any[]}
                expandAll
                hover
                activable
                onClick={handleTreeClick}
              />
            )}
          </div>

          {/* 右侧：归档检索表格 */}
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tag theme="primary" variant="light" size="large">
                  全部归档文件
                </Tag>
                <span style={{ color: '#888', fontSize: 13 }}>共 {filteredList.length} 份文件</span>
              </Space>
              <Input
                style={{ width: 260 }}
                value={searchKey}
                onChange={(v) => setSearchKey(String(v))}
                placeholder="按文件名或人名搜索..."
                prefixIcon={<SearchIcon />}
                clearable
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredList.map((item) => {
                const meta = SOURCE_META[item.sourceType] || { label: item.sourceType, theme: 'default' as const };
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#fff',
                      border: '1px solid #E8E5E0',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setDetail(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#B22222';
                      e.currentTarget.style.background = '#FFF5F5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E8E5E0';
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <FileIcon style={{ color: '#0052d9', marginRight: 10, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: '#1d2129', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.fileName}
                      </div>
                      <div style={{ fontSize: 12, color: '#86909C', marginTop: 2 }}>
                        {item.sourceName} · {formatFileSize(item.sizeBytes || 0)}
                      </div>
                    </div>
                    <Tag theme={meta.theme} variant="light" size="small" style={{ marginRight: 12 }}>
                      {meta.label}
                    </Tag>
                    <Button
                      key={`dl-${item.id}`}
                      theme="primary"
                      variant="text"
                      size="small"
                      icon={<DownloadIcon />}
                      onClick={(e: any) => {
                        e?.stopPropagation?.();
                        if (!item.storageKey) {
                          MessagePlugin.warning('该归档项为业务台账记录，无独立附件文件');
                          return;
                        }
                        handleDownload(item);
                      }}
                      disabled={!item.storageKey}
                    >
                      {item.storageKey ? '下载' : '台账'}
                    </Button>
                  </div>
                );
              })}
              {filteredList.length === 0 && !loading && (
                <Empty description="没有匹配的归档文件" />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 归档项详情弹窗 */}
      <Dialog
        header="归档项详情"
        visible={!!detail}
        onClose={() => setDetail(null)}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
            {detail && detail.storageKey && /^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/.test(detail.storageKey) && (
              <Button theme="primary" icon={<DownloadIcon />} onClick={() => handleDownload(detail)}>
                下载 / 预览原文件
              </Button>
            )}
          </Space>
        }
        width={480}
      >
        {detail && (
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>文件名</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{detail.fileName}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>所属届次</span>
              <span style={{ flex: 1 }}>{detailFief?.termName || detailFief?.name || detail.electionFiefId || '—'}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>来源类型</span>
              <span style={{ flex: 1 }}>
                <Tag
                  theme={(SOURCE_META[detail.sourceType]?.theme) || 'default'}
                  variant="light"
                  size="small"
                >
                  {SOURCE_META[detail.sourceType]?.label || detail.sourceType}
                </Tag>
              </span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>业务归属</span>
              <span style={{ flex: 1 }}>{detail.sourceName || '—'}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>文件大小</span>
              <span style={{ flex: 1 }}>{formatFileSize(detail.sizeBytes || 0)}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 90, color: '#86909C' }}>归档时间</span>
              <span style={{ flex: 1 }}>{String(detail.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#F5F3F0', borderRadius: 6, fontSize: 12, color: '#7A7A7A' }}>
              正式归档文件存储在服务器 uploads 目录，按「归属地 / 届 / 分类」归档；此处为归档台账。
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
