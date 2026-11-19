import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * RichText — renders a block of lightly-formatted text.
 *
 * Handles the markdown authors actually type in generated/notes content:
 *   - headings  (#, ##, ###)
 *   - bullet + numbered lists
 *   - **bold**, *italic* / _italic_, `code`
 *   - > blockquotes and --- rules
 * and, within any of those, inline LaTeX (\( \), \[ \], $$, bare environments)
 * is typeset with KaTeX. Everything else is rendered as escaped plain text.
 */

const MATH_SPLIT = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})/g
const INLINE_SPLIT = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g

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

function mathToHtml(part) {
  if (part.startsWith('\\[') && part.endsWith('\\]')) return renderMath(part.slice(2, -2), true)
  if (part.startsWith('\\(') && part.endsWith('\\)')) return renderMath(part.slice(2, -2), false)
  if (part.startsWith('$$') && part.endsWith('$$')) return renderMath(part.slice(2, -2), true)
  if (part.startsWith('\\begin{')) {
    const m = /^\\begin\{([^}]+)\}/.exec(part)
    if (m) return renderMath(part, true)
  }
  return escapeHtml(part)
}

const isMath = (p) =>
  (p.startsWith('\\[') && p.endsWith('\\]')) ||
  (p.startsWith('\\(') && p.endsWith('\\)')) ||
  (p.startsWith('$$') && p.endsWith('$$')) ||
  p.startsWith('\\begin{')

// Inline emphasis / code inside a plain-text run, rendered as React nodes.
function inlineNodes(text, keyPrefix) {
  const out = []
  const parts = text.split(INLINE_SPLIT)
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]
    if (!seg) continue
    const key = `${keyPrefix}-${i}`
    if (seg.length > 4 && seg.startsWith('**') && seg.endsWith('**')) {
      out.push(<strong key={key}>{seg.slice(2, -2)}</strong>)
    } else if (seg.length > 4 && seg.startsWith('__') && seg.endsWith('__')) {
      out.push(<strong key={key}>{seg.slice(2, -2)}</strong>)
    } else if (seg.length > 2 && seg.startsWith('`') && seg.endsWith('`')) {
      out.push(<code key={key} className="rt-code">{seg.slice(1, -1)}</code>)
    } else if (seg.length > 2 && seg.startsWith('*') && seg.endsWith('*')) {
      out.push(<em key={key}>{seg.slice(1, -1)}</em>)
    } else if (seg.length > 2 && seg.startsWith('_') && seg.endsWith('_')) {
      out.push(<em key={key}>{seg.slice(1, -1)}</em>)
    } else {
      out.push(seg)
    }
  }
  return out
}

// Render a single string that may contain math and/or inline markdown.
function renderInline(text, keyPrefix) {
  if (!text) return null
  if (!text.includes('\\') && !text.includes('$') && !INLINE_SPLIT.test(text)) return text
  INLINE_SPLIT.lastIndex = 0
  const mathParts = text.split(MATH_SPLIT)
  const nodes = []
  mathParts.forEach((part, mi) => {
    if (!part) return
    if (isMath(part)) {
      nodes.push(
        <span key={`m-${keyPrefix}-${mi}`} dangerouslySetInnerHTML={{ __html: mathToHtml(part) }} />
      )
    } else {
      nodes.push(...inlineNodes(part, `t-${keyPrefix}-${mi}`))
    }
  })
  return nodes
}

function parseBlocks(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let i = 0
  const isSpecial = (l) =>
    /^\s*#{1,6}\s+/.test(l) ||
    /^\s*>\s?/.test(l) ||
    /^\s*([-*+])\s+/.test(l) ||
    /^\s*\d+[.)]\s+/.test(l) ||
    /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i++; continue }

    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2].trim() })
      i++; continue
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++; continue
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: buf.join(' ') })
      continue
    }

    if (/^\s*([-*+])\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*([-*+])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // paragraph — gather until blank line or a block-level marker
    const buf = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !isSpecial(lines[i])) {
      buf.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'p', text: buf.join(' ') })
  }
  return blocks
}

export default function RichText({ children, text, className = '', as: Tag = 'div', style }) {
  const src = typeof children === 'string' ? children : typeof text === 'string' ? text : String(children ?? text ?? '')
  // Fast path: no markdown-ish characters at all.
  if (!/[#>*`_\-$\\]|\n/.test(src)) {
    return <Tag className={className} style={style}>{src}</Tag>
  }
  const blocks = parseBlocks(src)
  return (
    <Tag className={`rt ${className}`.trim()} style={style}>
      {blocks.map((b, bi) => {
        if (b.type === 'h') {
          const H = `h${Math.min(6, b.level + 2)}`
          return <H key={bi}>{renderInline(b.text, `h${bi}`)}</H>
        }
        if (b.type === 'hr') return <hr key={bi} className="rt-hr" />
        if (b.type === 'quote') return <blockquote key={bi} className="rt-quote">{renderInline(b.text, `q${bi}`)}</blockquote>
        if (b.type === 'ul') {
          return (
            <ul key={bi} className="rt-list">
              {b.items.map((it, ii) => <li key={ii}>{renderInline(it, `ul${bi}-${ii}`)}</li>)}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={bi} className="rt-list rt-ol">
              {b.items.map((it, ii) => <li key={ii}>{renderInline(it, `ol${bi}-${ii}`)}</li>)}
            </ol>
          )
        }
        return <p key={bi} className="rt-p">{renderInline(b.text, `p${bi}`)}</p>
      })}
    </Tag>
  )
}

/** Inline-only variant — markdown emphasis + math, no block elements. */
export function InlineText({ children }) {
  const text = typeof children === 'string' ? children : String(children ?? '')
  return <>{renderInline(text, 'inline')}</>
}
