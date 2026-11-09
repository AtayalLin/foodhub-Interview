import { describe, expect, it } from 'vitest'
import { sanitizeIntro } from '../../server/utils/sanitize-intro'

describe('sanitizeIntro 白名單', () => {
  it('保留店家排版用的格式', () => {
    const html = '<p>來自布魯克林的<strong>手打牛肉漢堡</strong></p><p>週一至週五 <em>11:00–21:00</em></p><ul><li>活動一</li></ul>'
    expect(sanitizeIntro(html)).toBe(html)
  })

  it('移除事件屬性與 <script>（seed 的實際攻擊內容）', () => {
    const out = sanitizeIntro(`<p>咖哩</p><img src="x" onerror="fetch('/api/track')"><script>alert(1)</script><p>素食友善</p>`)
    expect(out).toBe('<p>咖哩</p><p>素食友善</p>')
  })

  it('移除 style / class，店家無法用 CSS 蓋住總部版型', () => {
    const out = sanitizeIntro('<p style="position:fixed;inset:0" class="overlay">假登入框</p>')
    expect(out).toBe('<p>假登入框</p>')
  })

  it('連結只允許 https，並強制開新分頁、不洩漏來源', () => {
    expect(sanitizeIntro('<a href="javascript:alert(1)">點我</a>')).toBe('<a target="_blank" rel="noopener noreferrer">點我</a>')
    expect(sanitizeIntro('<a href="https://example.com">活動</a>'))
      .toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">活動</a>')
  })
})
