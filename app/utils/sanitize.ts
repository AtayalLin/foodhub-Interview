// 移除 <script> 標籤，避免 XSS
// ↑ 更正：只移除 <script> 擋不住 XSS，<img onerror>、<a href="javascript:"> 等都會通過（seed 的 Spice Route 介紹即為一例）。
//   真正的防護已改在 server 端以白名單清理（server/utils/sanitize-intro.ts），API 回傳的 intro 已是安全的 HTML。
//   這裡保留原函式不動，僅作為額外的一層，不應再依賴它防 XSS。
export function sanitize(html: string) {
  return html.replace(/<script.*?<\/script>/gis, '')
}
