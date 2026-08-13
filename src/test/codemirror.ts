import { act } from '@testing-library/react'
import { EditorView } from '@codemirror/view'

/** Sets a mounted CodeEditor's full contents by dispatching a real
 * CodeMirror transaction directly on its EditorView, rather than trying to
 * simulate keystrokes/paste through jsdom's contenteditable element — jsdom
 * doesn't implement the native browser input pipeline CodeMirror 6 relies
 * on for real typing (no DOM mutation from keydown/beforeinput,
 * `userEvent.paste()` outright throws on contenteditable targets: see
 * testing-library/user-event#699), so this dispatches the exact same kind
 * of transaction real input produces instead.
 *
 * `dom` is anything inside the `.cm-editor` tree — typically what
 * `screen.getByRole('textbox', { name: ... })` returns, since CodeMirror
 * always sets `role="textbox"` on `.cm-content`. */
export function setCodeMirrorValue(dom: HTMLElement, text: string) {
  const view = EditorView.findFromDOM(dom)
  if (!view) {
    throw new Error('setCodeMirrorValue: no CodeMirror EditorView found for this element')
  }
  act(() => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor: text.length },
      userEvent: 'input.type',
    })
  })
}
