// [ENV-CONFIG] CDN 单实例 shim：react-dom 统一取 window.ReactDOM
const ReactDOM = window.ReactDOM;
export default ReactDOM;
export const {
  createPortal, flushSync, hydrate, render, unmountComponentAtNode, version,
} = ReactDOM;
