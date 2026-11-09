// 移除 <script> 標籤，避免 XSS
export function sanitize(html: string) {
  return html.replace(/<script.*?<\/script>/gis, '')
}
