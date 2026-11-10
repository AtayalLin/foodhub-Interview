// 以台灣時間（平台營運時區）與固定格式顯示日期時間，例如「2026/10/20 下午8:30:00」，
// 外觀與原本的 toLocaleString('zh-TW') 相同。
// 不直接用 toLocaleString('zh-TW')：它的結果取決於執行環境的時區與語系資料，
// SSR（server）與瀏覽器不一定相同 → hydration mismatch。例如 Docker 容器是 UTC，server 會顯示差 8 小時的時間；
// Node 與 Chrome 的語系資料版本不同，日期與時間之間的空白字元也不一樣。
// 這裡只向 Intl 取「台灣時間的數字」，字串由自己組合，server 與瀏覽器的結果就一定相同。
const taipei = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23',
})

export function formatDateTime(iso: string) {
  const parts = taipei.formatToParts(new Date(iso))
  const n = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value)
  const hour = n('hour')
  const period = hour < 12 ? '上午' : '下午'
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${n('year')}/${n('month')}/${n('day')} ${period}${hour % 12 || 12}:${pad(n('minute'))}:${pad(n('second'))}`
}
