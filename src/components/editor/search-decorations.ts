

import {
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
} from '@codemirror/view'

export interface SearchMatchRange {
  from: number
  to: number
}

export interface SearchHighlightConfig {
  
  matches: SearchMatchRange[]
  
  activeIndex: number
}

export const setSearchHighlights = StateEffect.define<SearchHighlightConfig | null>()

const MATCH_DECORATION = Decoration.mark({ class: 'cm-search-match' })

const ACTIVE_MATCH_DECORATION = Decoration.mark({ class: 'cm-search-match-active' })

export const searchHighlightField = StateField.define<DecorationSet>({
  create(): DecorationSet {
    return Decoration.none
  },

  update(decorations, tr): DecorationSet {
    
    for (const effect of tr.effects) {
      if (effect.is(setSearchHighlights)) {
        const config = effect.value
        if (!config || config.matches.length === 0) {
          return Decoration.none
        }

        const decoRanges: { from: number; to: number; decoration: Decoration }[] = []

        for (let i = 0; i < config.matches.length; i++) {
          const match = config.matches[i]
          const isActive = i === config.activeIndex
          decoRanges.push({
            from: match.from,
            to: match.to,
            decoration: isActive ? ACTIVE_MATCH_DECORATION : MATCH_DECORATION,
          })
        }

        
        decoRanges.sort((a, b) => a.from - b.from)

        return Decoration.set(
          decoRanges.map((d) => d.decoration.range(d.from, d.to)),
          true, 
        )
      }
    }

    
    if (tr.docChanged) {
      return decorations.map(tr.changes)
    }

    return decorations
  },

  provide: (field) => EditorView.decorations.from(field),
})

export const searchHighlightTheme = EditorView.theme({
  '.cm-search-match': {
    backgroundColor: 'var(--card-search-match-bg, rgba(255, 200, 0, 0.35))',
    borderRadius: '3px',
    padding: '0 1px',
    margin: '0 -1px',
  },
  '.cm-search-match-active': {
    backgroundColor: 'var(--card-search-active-bg, rgba(255, 140, 0, 0.55))',
    borderRadius: '3px',
    padding: '0 1px',
    margin: '0 -1px',
    outline: '1.5px solid var(--card-search-active-outline, rgba(255, 120, 0, 0.7))',
    outlineOffset: '0px',
  },
})

export const searchHighlightExtensions: Extension[] = [
  searchHighlightField,
  searchHighlightTheme,
]

export function applySearchHighlights(
  view: EditorView | null,
  config: SearchHighlightConfig | null,
): void {
  if (!view) return
  view.dispatch({
    effects: setSearchHighlights.of(config),
  })
}

export function scrollToMatch(
  view: EditorView | null,
  from: number,
  to: number,
): void {
  if (!view) return

  
  view.dispatch({
    selection: { anchor: from, head: to },
    scrollIntoView: true,
    
  })
}

