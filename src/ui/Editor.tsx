import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'

interface EditorProps {
  /** Initial text. The editor owns its text after mounting; remount (via `key`) to replace it. */
  initialValue: string
  language: 'javascript' | 'html'
  onChange?: (value: string) => void
  /** Ctrl/Cmd+Enter. */
  onRun?: () => void
  readOnly?: boolean
  label: string
}

// CodeMirror manages its own DOM, so React only gives it a container div and
// talks to it through callbacks. Callbacks are read through refs so the editor
// never has to be rebuilt when a parent re-renders.
export function Editor({ initialValue, language, onChange, onRun, readOnly = false, label }: EditorProps) {
  const container = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark')
    const extensions: Extension[] = [
      basicSetup,
      language === 'html' ? html() : javascript(),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      // readOnly alone still leaves the text focusable as an editable field;
      // turning off `editable` makes screen readers announce it as static text.
      EditorView.editable.of(!readOnly),
      EditorView.contentAttributes.of({ 'aria-label': label }),
      // Highest precedence so Ctrl+Enter runs instead of inserting a line.
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onRunRef.current?.()
              return true
            },
          },
        ]),
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
      }),
      EditorView.theme({
        '&': { fontSize: '13px' },
        '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
      }),
    ]
    if (dark) extensions.push(oneDark)

    const view = new EditorView({
      parent: container.current!,
      state: EditorState.create({ doc: initialValue, extensions }),
    })
    return () => view.destroy()
    // Deliberately not rebuilt when initialValue changes: the user's typing is
    // the source of truth. The parent remounts the editor (new `key`) for a new challenge.
  }, [language, readOnly])

  return <div ref={container} className="overflow-hidden rounded-md border text-left" />
}
