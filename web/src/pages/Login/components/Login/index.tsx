import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  Form,
  type FormInstanceFunctions,
  Input,
  MessagePlugin,
  Radio,
  type SubmitContext,
} from 'tdesign-react';
import { BrowseIcon, BrowseOffIcon, ChevronRightIcon, LockOnIcon, UserIcon } from 'tdesign-icons-react';
import classnames from 'classnames';
import { getOrganizations, OrgItem } from '../../../../api/auth';
import { useAuthStore } from '../../../../stores/useAuthStore';

import Style from './index.module.less';

const { FormItem } = Form;

const DEFAULT_PHONE = '13800000001';
const DEFAULT_PASSWORD = '123456';

export default function Login() {
  const [showPsw, toggleShowPsw] = useState(false);
  const [filterType, setFilterType] = useState<'village' | 'community'>('village');
  const [allOrgs, setAllOrgs] = useState<OrgItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgItem | null>(null);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<FormInstanceFunctions>();
  const navigate = useNavigate();
  const authLogin = useAuthStore((s) => s.login);

  // 拉取真实组织列表
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getOrganizations()
      .then((list) => {
        if (!alive) return;
        setAllOrgs(list || []);
        if (list?.length) {
          const preferred = list.find((o) => o.name.includes('霞皋') || o.slug.includes('xiagao'))
            || list.find((o) => o.orgType === 'village')
            || list[0];
          if (preferred) {
            setSelectedOrg(preferred);
            setFilterType(preferred.orgType as 'village' | 'community');
          }
        }
      })
      .catch(() => { if (alive) setAllOrgs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // 表单初始值填充（数据就绪后一次性写入）
  useEffect(() => {
    if (loading || !formRef.current) return;
    formRef.current.setFieldsValue({
      organizationId: selectedOrg?.id || '',
      phone: DEFAULT_PHONE,
      password: DEFAULT_PASSWORD,
    });
  }, [loading, selectedOrg]);

  const villageList = allOrgs
    .filter((o) => o.orgType === 'village')
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

  const communityList = allOrgs
    .filter((o) => o.orgType === 'community')
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

  const handlePickOrg = (org: OrgItem) => {
    setSelectedOrg(org);
    formRef.current?.setFieldsValue({ organizationId: org.id });
    setPickerVisible(false);
  };

  const onSubmit = async (e: SubmitContext) => {
    if (e.validateResult !== true) return;
    const formValue = formRef.current?.getFieldsValue?.(true) || {};
    const { organizationId, phone, password } = formValue;
    if (!organizationId || !phone || !password) {
      MessagePlugin.error('请完整选择归属地、输入手机号和密码');
      return;
    }
    setSubmitting(true);
    try {
      await authLogin(String(phone).trim(), String(password).trim(), String(organizationId));
      MessagePlugin.success('登录成功，正在进入本村/社区工作台');
      navigate('/election/home');
    } catch (err: any) {
      MessagePlugin.error(err.message || '登录失败，请核对归属地、账号或密码');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = filterType === 'community' ? '社区' : '行政村';

  return (
    <div>
      <Form ref={formRef} className={classnames(Style.itemContainer)} labelWidth={0} onSubmit={onSubmit}>
        {/* ① 村/社区双轨切换 */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Radio.Group variant="default-filled" value={filterType} onChange={(v) => setFilterType(v as any)} size="large">
            <Radio.Button value="village">🏡 农村行政村</Radio.Button>
            <Radio.Button value="community">🏘 城市社区</Radio.Button>
          </Radio.Group>
        </div>

        {/* ② 归属地选择 —— 点击弹出面板 */}
        <FormItem name="organizationId" rules={[{ required: true, message: '请选择您的归属村或社区', type: 'error' }]}>
          <div
            className={Style.orgPicker}
            onClick={() => !loading && setPickerVisible(true)}
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <span style={{ color: 'var(--td-text-color-placeholder)' }}>加载中…</span>
            ) : selectedOrg ? (
              <span style={{ color: 'var(--td-text-color-primary)' }}>
                {selectedOrg.orgType === 'community' ? '🏘' : '🏡'} {selectedOrg.name}
              </span>
            ) : (
              <span style={{ color: 'var(--td-text-color-placeholder)' }}>请选择{typeLabel}</span>
            )}
            <ChevronRightIcon style={{ color: 'var(--td-text-color-placeholder)' }} />
          </div>
        </FormItem>

        {/* ③ 手机号 */}
        <FormItem name="phone" rules={[{ required: true, message: '请输入手机号', type: 'error' }]}>
          <Input size="large" maxlength={11} placeholder="请输入登录手机号" prefixIcon={<UserIcon />} />
        </FormItem>

        {/* ④ 密码 */}
        <FormItem name="password" rules={[{ required: true, message: '请输入登录密码', type: 'error' }]}>
          <Input
            size="large"
            type={showPsw ? 'text' : 'password'}
            clearable
            placeholder="请输入密码（默认 123456）"
            prefixIcon={<LockOnIcon />}
            suffixIcon={
              showPsw
                ? <BrowseIcon onClick={() => toggleShowPsw((c) => !c)} />
                : <BrowseOffIcon onClick={() => toggleShowPsw((c) => !c)} />
            }
          />
        </FormItem>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          注：村居内部工作账号由平台超级管理员统一分配开通；登录后可在个人中心自主修改密码。
        </div>

        <FormItem>
          <Button block size="large" type="submit" theme="primary" loading={submitting}>
            登录工作台
          </Button>
        </FormItem>
      </Form>

      {/* 归属地选择弹窗 */}
      <Dialog
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={`选择${typeLabel}`}
        placement="center"
        width={420}
        confirmBtn={null}
        cancelBtn="关闭"
        onCancel={() => setPickerVisible(false)}
      >
        <div className={Style.orgList}>
          {villageList.length > 0 && (
            <div className={Style.orgGroup}>
              <div className={Style.orgGroupTitle}>🏡 农村行政村</div>
              {villageList.map((org) => (
                <div
                  key={org.id}
                  className={classnames(Style.orgItem, { [Style.orgItemActive]: selectedOrg?.id === org.id })}
                  onClick={() => handlePickOrg(org)}
                >
                  <span>{org.name}</span>
                  {selectedOrg?.id === org.id && (
                    <span style={{ color: 'var(--td-brand-color)', fontSize: 12 }}>已选</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {communityList.length > 0 && (
            <div className={Style.orgGroup}>
              <div className={Style.orgGroupTitle}>🏘 城市社区</div>
              {communityList.map((org) => (
                <div
                  key={org.id}
                  className={classnames(Style.orgItem, { [Style.orgItemActive]: selectedOrg?.id === org.id })}
                  onClick={() => handlePickOrg(org)}
                >
                  <span>{org.name}</span>
                  {selectedOrg?.id === org.id && (
                    <span style={{ color: 'var(--td-brand-color)', fontSize: 12 }}>已选</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {allOrgs.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--td-text-color-secondary)' }}>
              暂无可用组织
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
