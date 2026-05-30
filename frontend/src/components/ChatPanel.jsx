import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X, Trash2, Send, Loader2, Sparkles, ChevronDown, StopCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { getChatHistory, clearChatHistory, sendChatMessage } from '../api/client'

// ── Starter questions ─────────────────────────────────────────────────────────
const STARTERS = [
  'What are the top 3 things to fix before submitting?',
  'What would it take to get a READY TO SEND verdict?',
  'Give me a full improvement plan',
  'Compare all versions and show score trends',
  'Explain every double-flagged issue in detail',
  'What are the biggest competitive weaknesses?',
]

// ── Tiny markdown renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="my-2 rounded-lg overflow-x-auto text-xs"
          style={{ background: 'var(--t-bg3,#1f2937)', padding: '10px 12px', color: 'var(--t-text3,#d1d5db)' }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // H1
    if (/^# /.test(line)) {
      elements.push(<h2 key={i} className="text-sm font-bold mt-3 mb-1" style={{ color: 'var(--t-text1)' }}>{inlineFormat(line.slice(2))}</h2>)
      i++; continue
    }
    // H2
    if (/^## /.test(line)) {
      elements.push(<h3 key={i} className="text-xs font-bold mt-2.5 mb-0.5 uppercase tracking-wide" style={{ color: 'var(--t-text4)' }}>{inlineFormat(line.slice(3))}</h3>)
      i++; continue
    }
    // H3
    if (/^### /.test(line)) {
      elements.push(<h4 key={i} className="text-xs font-semibold mt-2 mb-0.5" style={{ color: 'var(--t-text3)' }}>{inlineFormat(line.slice(4))}</h4>)
      i++; continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-2 border-0 border-t" style={{ borderColor: 'var(--t-border2)' }} />)
      i++; continue
    }

    // Bullet list
    if (/^[\-\*] /.test(line)) {
      const items = []
      while (i < lines.length && /^[\-\*] /.test(lines[i])) {
        items.push(<li key={i} className="ml-3 text-xs leading-relaxed list-disc">{inlineFormat(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="my-1 space-y-0.5">{items}</ul>)
      continue
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = lines[i].replace(/^\d+\. /, '')
        items.push(<li key={i} className="ml-4 text-xs leading-relaxed list-decimal">{inlineFormat(text)}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="my-1 space-y-0.5">{items}</ol>)
      continue
    }

    // Empty line → spacing
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
      i++; continue
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-xs leading-relaxed">{inlineFormat(line)}</p>
    )
    i++
  }
  return elements
}

function inlineFormat(text) {
  // Split on bold (**...**), italic (*...*), inline code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (/^\*[^*]+\*$/.test(part))   return <em key={i}>{part.slice(1, -1)}</em>
    if (/^`[^`]+`$/.test(part))     return <code key={i} className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--t-bg3)', color: 'var(--t-text3)' }}>{part.slice(1, -1)}</code>
    return part
  })
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, streaming }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-2 mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
          <Sparkles size={11} className="text-white" />
        </div>
      )}

      <div
        className={clsx('max-w-[82%] rounded-2xl px-3 py-2', isUser ? 'rounded-tr-sm' : 'rounded-tl-sm')}
        style={isUser
          ? { background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff' }
          : { background: 'var(--t-bg3,#1f2937)', color: 'var(--t-text2,#f3f4f6)', border: '1px solid var(--t-border1,#1f2937)' }
        }
      >
        {isUser
          ? <p className="text-xs leading-relaxed">{msg.content}</p>
          : <div className="chat-md">{renderMarkdown(msg.content)}</div>
        }
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse"
            style={{ background: 'var(--t-text4)', verticalAlign: 'text-bottom' }} />
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-gray-700">
          <span className="text-[9px] font-bold text-gray-300">U</span>
        </div>
      )}
    </div>
  )
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel({ groupId, versionCount, onClose }) {
  const [messages, setMessages]     = useState([])   // {role, content}
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [streaming, setStreaming]    = useState(false)
  const [streamingIdx, setStreamingIdx] = useState(null)
  const [error, setError]           = useState(null)
  const [atBottom, setAtBottom]     = useState(true)

  const bottomRef   = useRef(null)
  const scrollRef   = useRef(null)
  const abortRef    = useRef(null)
  const inputRef    = useRef(null)

  // Load history on mount
  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    getChatHistory(groupId)
      .then(data => setMessages(data.messages || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [groupId])

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, atBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(near)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAtBottom(true)
  }

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || streaming) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: msg }
    const aiMsg   = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, userMsg, aiMsg])
    setStreaming(true)
    setStreamingIdx(prev => (prev === null ? 1 : prev + 2))
    setAtBottom(true)

    abortRef.current = new AbortController()
    try {
      const stream = await sendChatMessage(groupId, msg, abortRef.current.signal)
      const reader  = stream.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()   // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'delta') {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + evt.text,
                }
                return copy
              })
            } else if (evt.type === 'done') {
              break
            } else if (evt.type === 'error') {
              setError(evt.message || 'An error occurred')
              break
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to send message')
        // Remove the empty AI message on error
        setMessages(prev => prev.slice(0, -1))
      }
    } finally {
      setStreaming(false)
      setStreamingIdx(null)
      inputRef.current?.focus()
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const handleClear = async () => {
    if (streaming) return
    await clearChatHistory(groupId).catch(() => {})
    setMessages([])
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isEmpty = !loading && messages.length === 0

  const panel = (
    <div
      className="fixed right-0 top-0 h-full flex flex-col z-[9998]"
      style={{
        width: 'min(100vw, clamp(320px, 28vw, 420px))',
        background: 'var(--t-bg1,#030712)',
        borderLeft: '1px solid var(--t-border1,#1f2937)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        animation: 'slide-in-right 0.22s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: '1px solid var(--t-border1)', background: 'var(--t-bg2)' }}>
        <div className="p-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563eb22,#7c3aed22)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Sparkles size={14} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text1)' }}>NaviSpark AI</p>
          <p className="text-[10px]" style={{ color: 'var(--t-text5)' }}>
            {versionCount} version{versionCount !== 1 ? 's' : ''} · Full analysis access
          </p>
        </div>
        <button onClick={handleClear} disabled={streaming || isEmpty}
          title="Clear conversation"
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--t-text5)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t-text5)'}>
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} title="Close"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--t-text5)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--t-text1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t-text5)'}>
          <X size={15} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 min-h-0">

        {loading && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--t-text5)' }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Loading conversation…</span>
          </div>
        )}

        {!loading && isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-2">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#2563eb22,#7c3aed22)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <MessageSquare size={22} className="text-blue-400" />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text1)' }}>Ask about your proposal</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--t-text5)' }}>
                I have full access to all {versionCount} version{versionCount !== 1 ? 's' : ''} and every agent's analysis
              </p>
            </div>
            <div className="w-full space-y-1.5">
              {STARTERS.map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  className="w-full text-left text-[11px] px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: 'var(--t-bg3)',
                    border: '1px solid var(--t-border1)',
                    color: 'var(--t-text3)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = 'var(--t-text1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-border1)'; e.currentTarget.style.color = 'var(--t-text3)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            msg={msg}
            streaming={streaming && idx === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {error && (
          <div className="mb-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {!atBottom && (
        <button onClick={scrollToBottom}
          className="absolute bottom-20 right-4 p-1.5 rounded-full shadow-lg transition-all"
          style={{ background: 'var(--t-bg3)', border: '1px solid var(--t-border2)', color: 'var(--t-text4)' }}>
          <ChevronDown size={14} />
        </button>
      )}

      {/* ── Input area ── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2"
        style={{ borderTop: '1px solid var(--t-border1)', background: 'var(--t-bg2)' }}>
        <div className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--t-bg3)', border: '1px solid var(--t-border2)' }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKey}
            placeholder="Ask about your proposal…"
            disabled={streaming}
            className="flex-1 resize-none bg-transparent outline-none text-xs leading-relaxed disabled:opacity-50"
            style={{
              color: 'var(--t-text1)',
              minHeight: '20px',
              maxHeight: '120px',
              scrollbarWidth: 'none',
              '::placeholder': { color: 'var(--t-text6)' },
            }}
          />
          {streaming
            ? (
              <button onClick={stop} title="Stop generation"
                className="flex-shrink-0 p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-300">
                <StopCircle size={16} />
              </button>
            ) : (
              <button onClick={() => send()} disabled={!input.trim()}
                title="Send (Enter)"
                className="flex-shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: input.trim() ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'transparent', color: '#fff' }}>
                <Send size={14} />
              </button>
            )
          }
        </div>
        <p className="text-center text-[9px] mt-1.5" style={{ color: 'var(--t-text6)' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

// ── Toggle button (rendered inline in the page header) ────────────────────────
export function ChatToggleButton({ onClick, active, unread }) {
  return (
    <button
      onClick={onClick}
      title="NaviSpark AI Chat"
      className={clsx(
        'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
        active
          ? 'text-white border-blue-500/60'
          : 'text-gray-400 hover:text-white border-gray-700/60 hover:border-gray-500',
      )}
      style={active ? { background: 'linear-gradient(135deg,#1d4ed822,#7c3aed22)' } : {}}
    >
      <MessageSquare size={14} />
      <span className="hidden sm:inline text-xs">AI Chat</span>
      {unread && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2"
          style={{ borderColor: 'var(--t-bg1)' }} />
      )}
    </button>
  )
}
