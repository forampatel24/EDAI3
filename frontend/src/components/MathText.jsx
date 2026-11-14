import katex from 'katex'
import 'katex/dist/katex.min.css'

// Matches display \(...\) / \[...\] / $$...$$ and bare LaTeX environments.
const MATH_SPLIT = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})/g

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderMath(tex, display) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: false })
  } catch {
    return escapeHtml(tex)
  }
}

/**
 * Renders a text string, turning embedded LaTeX (\(...\), \[...\], $$...$$ and
 * bare \begin{...}...\end{...} environments) into typeset math via KaTeX.
 * Plain text segments are HTML-escaped; math is rendered with trust:false.
 */
export default function MathText({ children, as: Tag = 'div', style, className }) {
  const text = typeof children === 'string' ? children : String(children ?? '')
  if (!text.includes('\\') && !text.includes('$')) {
    return <Tag style={style} className={className}>{text}</Tag>
  }
  const parts = text.split(MATH_SPLIT)
  const html = parts.map(part => {
    if (!part) return ''
    if (part.startsWith('\\[') && part.endsWith('\\]')) return renderMath(part.slice(2, -2), true)
    if (part.startsWith('\\(') && part.endsWith('\\)')) return renderMath(part.slice(2, -2), false)
    if (part.startsWith('$$') && part.endsWith('$$')) return renderMath(part.slice(2, -2), true)
    if (part.startsWith('\\begin{')) {
      const m = /^\\begin\{([^}]+)\}/.exec(part)
      const endIdx = part.lastIndexOf('\\end{')
      if (m && endIdx > 0) {
        const inner = part.slice(m[0].length, endIdx)
        return renderMath(`\\begin{${m[1]}}${inner}\\end{${m[1]}}`, true)
      }
    }
    return escapeHtml(part)
  }).join('')
  return <Tag style={style} className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
