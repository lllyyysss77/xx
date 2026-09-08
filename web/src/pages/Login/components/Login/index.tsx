import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  type FormInstanceFunctions,
  Input,
  MessagePlugin,
  Select,
  Radio,
  Space,
  type SubmitContext,
} from 'tdesign-react';
import { BrowseIcon, BrowseOffIcon, LockOnIcon, UserIcon } from 'tdesign-icons-react';
import classnames from 'classnames';
import { getOrganizations, OrgItem } from '../../../../api/auth';
import { useAuthStore } from '../../../../stores/useAuthStore';

import Style from './index.module.less';

const { FormItem } = Form;

export default function Login() {
  const [showPsw, toggleShowPsw] = useState(false);
  const [filterType, setFilterType] = useState<'village' | 'community'>('village');
  const [allOrgs, setAllOrgs] = useState<OrgItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<FormInstanceFunctions>();
  const navigate = useNavigate();
  const authLogin = useAuthStore((s) => s.login);

  // 拉取真实组织列表（按村/社区物理双轨区分）
  useEffect(() => {
    let alive = true;
    getOrganizations()
      .then((list) => {
        if (!alive || !list?.length) return;
        setAllOrgs(list);
        // 默认选中第一个村
        const first = list.find((o) => o.orgType === 'village') || list[0];
        if (first && formRef.current) {
          formRef.current.setFieldsValue({ organizationId: first.id });
        }
      })
      .catch(() => {
        if (alive) setAllOrgs([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 根据当前选择的「村」或「社区」过滤下拉选项
  const currentOptions = allOrgs
    .filter((o) => o.orgType === filterType)
    .map((o) => ({
      label: `${filterType === 'community' ? '🏘 社区' : '🏡 村'} · ${o.name}`,
      value: o.id,
    }));

  const onTypeChange = (val: any) => {
    setFilterType(val);
    const matched = allOrgs.filter((o) => o.orgType === val);
    if (matched[0] && formRef.current) {
      formRef.current.setFieldsValue({ organizationId: matched[0].id });
    }
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

  return (
    <div>
      <Form ref={formRef} className={classnames(Style.itemContainer)} labelWidth={0} onSubmit={onSubmit}>
        {/* ① 起手村/社区严格双轨切页 */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Radio.Group
            variant="default-filled"
            value={filterType}
            onChange={onTypeChange}
            size="large"
          >
            <Radio.Button value="village">🏡 农村行政村</Radio.Button>
            <Radio.Button value="community">🏘 城市社区</Radio.Button>
          </Radio.Group>
        </div>

        {/* ② 对应村/社区下拉选择 */}
        <FormItem
          name="organizationId"
          rules={[{ required: true, message: '请选择您的归属村或社区', type: 'error' }]}
        >
          <Select
            size="large"
            placeholder={currentOptions.length ? `请选择${filterType === 'community' ? '社区' : '行政村'}` : '加载中…'}
            options={currentOptions}
            filterable
            disabled={!currentOptions.length}
          />
        </FormItem>

        {/* ③ 手机号 (后台超管授权预设) */}
        <FormItem
          name="phone"
          rules={[{ required: true, message: '请输入手机号', type: 'error' }]}
        >
          <Input size="large" maxlength={11} placeholder="请输入登录手机号" prefixIcon={<UserIcon />} />
        </FormItem>

        {/* ④ 初始默认密码 123456 */}
        <FormItem name="password" rules={[{ required: true, message: '请输入登录密码', type: 'error' }]}>
          <Input
            size="large"
            type={showPsw ? 'text' : 'password'}
            clearable
            placeholder="请输入密码（默认 123456）"
            prefixIcon={<LockOnIcon />}
            suffixIcon={
              showPsw ? (
                <BrowseIcon onClick={() => toggleShowPsw((c) => !c)} />
              ) : (
                <BrowseOffIcon onClick={() => toggleShowPsw((c) => !c)} />
              )
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
    </div>
  );
}
