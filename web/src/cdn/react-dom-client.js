// [ENV-CONFIG] CDN 单实例 shim：react-dom/client（createRoot/hydrateRoot）
const { createRoot, hydrateRoot } = window.ReactDOM;
export { createRoot, hydrateRoot };
export default { createRoot, hydrateRoot };
