


import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'




const HIGHLIGHT_MARK = Decoration.mark({ class: 'cm-mark' })


const UNDERLINE_MARK = Decoration.mark({ class: 'cm-underline' })




const HIGHLIGHT_RE = /==[\s\S]+?==/g


const UNDERLINE_RE = /\^[^^\n]+\^/g




function buildDecorations(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number; decoration: Decoration }[] = []
  const doc = view.state.doc
  const text = doc.toString()

  
  for (const match of text.matchAll(HIGHLIGHT_RE)) {
    decorations.push({
      from: match.index!,
      to: match.index! + match[0].length,
      decoration: HIGHLIGHT_MARK,
    })
  }

  
  for (const match of text.matchAll(UNDERLINE_RE)) {
    decorations.push({
      from: match.index!,
      to: match.index! + match[0].length,
      decoration: UNDERLINE_MARK,
    })
  }

  
  decorations.sort((a, b) => a.from - b.from)

  return Decoration.set(
    decorations.map((d) => d.decoration.range(d.from, d.to)),
    true, 
  )
}




export const highlightDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate): void {
      // Decorations cover document ranges, so scrolling does not require a full re-scan.
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
)
