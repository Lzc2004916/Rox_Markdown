


import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'




const BOLD_MARK = Decoration.mark({ class: 'cm-format-bold' })
const ITALIC_MARK = Decoration.mark({ class: 'cm-format-italic' })
const UNDERLINE_MARK = Decoration.mark({ class: 'cm-underline cm-format-underline' })
const STRIKE_MARK = Decoration.mark({ class: 'cm-format-strike' })
const SUPERSCRIPT_MARK = Decoration.mark({ class: 'cm-format-superscript' })
const SUBSCRIPT_MARK = Decoration.mark({ class: 'cm-format-subscript' })
const FORMULA_MARK = Decoration.mark({ class: 'cm-format-formula' })




const UNDERLINE_RE = /\^[^^\n]+\^/g
const BOLD_RE = /\*\*[\s\S]+?\*\*/g
const ITALIC_RE = /(?<!\*)\*[^*\n]+?\*(?!\*)/g
const STRIKE_RE = /~~[\s\S]+?~~/g
const SUPERSCRIPT_RE = /<sup>[\s\S]+?<\/sup>/g
const SUBSCRIPT_RE = /<sub>[\s\S]+?<\/sub>/g
const FORMULA_RE = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g




function buildDecorations(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number; decoration: Decoration }[] = []
  const doc = view.state.doc
  const text = doc.toString()

  const addMatches = (pattern: RegExp, decoration: Decoration): void => {
    for (const match of text.matchAll(pattern)) {
      decorations.push({
        from: match.index!,
        to: match.index! + match[0].length,
        decoration,
      })
    }
  }

  addMatches(BOLD_RE, BOLD_MARK)
  addMatches(ITALIC_RE, ITALIC_MARK)
  addMatches(STRIKE_RE, STRIKE_MARK)
  addMatches(SUPERSCRIPT_RE, SUPERSCRIPT_MARK)
  addMatches(SUBSCRIPT_RE, SUBSCRIPT_MARK)
  addMatches(FORMULA_RE, FORMULA_MARK)

  
  addMatches(UNDERLINE_RE, UNDERLINE_MARK)

  
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
