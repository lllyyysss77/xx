declare module '*.avif' {
  export default src as string;
}

declare module '*.bmp' {
  export default src as string;
}

declare module '*.gif' {
  export default src as string;
}

declare module '*.jpg' {
  export default src as string;
}

declare module '*.jpeg' {
  export default src as string;
}

declare module '*.png' {
  export default src as string;
}

declare module '*.webp' {
  export default src as string;
}

declare module '*.svg' {
  export default src as string;
}
declare module '*.svg?component' {
  export default src as string;
}
declare module '*.module.css' {
  export default classes as { readonly [key: string]: string };
}

declare module '*.module.less' {
  export default classes as { readonly [key: string]: string };
}

declare module '*.less' {
  export default classes as { readonly [key: string]: string };
}

declare module 'tvision-color';
declare module 'tdesign-react' {
  const content: any;
  export default content;
  export const Card: any;
  export const Table: any;
  export const Button: any;
  export const Dialog: any;
  export const Form: any;
  export const Input: any;
  export const DatePicker: any;
  export const DateRangePicker: any;
  export const DateRangePickerPanel: any;
  export const Select: any;
  export const InputNumber: any;
  export const Space: any;
  export const Tag: any;
  export const Divider: any;
  export const Descriptions: any;
  export const MessagePlugin: any;
  export const Row: any;
  export const Col: any;
  export const Layout: any;
  export const Header: any;
  export const Content: any;
  export const Footer: any;
  export const Aside: any;
  export const Menu: any;
  export const MenuItem: any;
  export const SubMenu: any;
  export const Radio: any;
  export const RadioGroup: any;
  export const Tabs: any;
  export const TabPanel: any;
  export const Loading: any;
  export const Tooltip: any;
  export const Breadcrumb: any;
  export const BreadcrumbItem: any;
  export const Steps: any;
  export const StepItem: any;
  export const Typography: any;
  export const Dropdown: any;
  export const DropdownMenu: any;
  export const DropdownItem: any;
  export const Switch: any;
  export const Popup: any;
  export const Badge: any;
  export const Checkbox: any;
  export const CheckboxGroup: any;
  export const Popconfirm: any;
  export const Collapse: any;
  export const CollapsePanel: any;
  export const Pagination: any;
  export const Alert: any;
  export const Progress: any;
  export const Avatar: any;
  export const Timeline: any;
  export const TimelineItem: any;
  export const Notification: any;
  export const Textarea: any;
  export const Drawer: any;
  export const Empty: any;
  export const Tree: any;
  export const Statistic: any;
  export type PrimaryTableCol<T = any> = any;
  export type FormInstanceFunctions = any;
  export type SubmitContext = any;
}
declare module 'tdesign-react/*';
declare module 'tdesign-icons-react';

declare interface ImportMeta {
  env: {
    MODE: 'development' | 'test' | 'release' | 'site';
  };
}
