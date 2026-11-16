import { Component, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

class Boundary extends Component<{ raw: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <pre className="whitespace-pre-wrap font-mono text-sm">{this.props.raw}</pre> : this.props.children
  }
}

// AC-042: rendered read-only; raw text if rendering fails. react-markdown does not render raw HTML.
export function Markdown({ text }: { text: string }) {
  return (
    <Boundary raw={text}>
      <div className="md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </Boundary>
  )
}
