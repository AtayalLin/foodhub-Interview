import sanitizeHtml from 'sanitize-html'

/**
 * 清理店家可編輯的餐廳介紹 HTML（白名單制）。
 *
 * 版型由總部的 Vue 元件決定、店家無法修改；店家只能在「介紹」這塊內容區排版活動文案。
 * 因此只允許排版用的標籤，不允許：
 * - 事件屬性（onerror、onclick…）與 <script> → 防止執行程式（XSS）
 * - style / class → 防止用 position:fixed 等蓋住整個頁面、偽造畫面
 * - <img> / <iframe> → 防止追蹤像素與嵌入外部內容
 *
 * 在 API 輸出時清理（而非前端）：所有讀到這份資料的地方都受保護，瀏覽器也不必載入清理程式。
 */
export function sanitizeIntro(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a'],
    // target / rel 由下方 transformTags 強制覆寫成固定值，店家自行填寫的值不會生效
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['https'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  })
}
