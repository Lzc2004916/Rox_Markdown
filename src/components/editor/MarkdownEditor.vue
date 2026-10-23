<template>
  <div ref="editorRef" class="markdown-editor" :style="formatColorVariables"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { InlineFormatColors } from '@/card'
import { EditorState, EditorSelection, Compartment, Prec, type Extension } from '@codemirror/state'
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  keymap,
  type Command,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, undo, redo, insertNewlineAndIndent } from '@codemirror/commands'
import { Transaction } from '@codemirror/state'
import { markdown, insertNewlineContinueMarkup } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { highlightDecorations } from './highlight-decorations'
import {
  searchHighlightExtensions,
  applySearchHighlights,
  scrollToMatch,
  type SearchHighlightConfig,
} from './search-decorations'



interface Props {
  modelValue: string
  
  theme?: string
  formatColors?: InlineFormatColors
}

const props = defineProps<Props>()

const formatColorVariables = computed(() => {
  const colors = props.formatColors ?? {}
  return Object.fromEntries(
    Object.entries(colors)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [`--format-${key}-color`, value]),
  )
})



const emit = defineEmits<{
  (e: 'update:modelValue', value: string, external?: boolean): void
  (e: 'ready', view: EditorView): void
  (e: 'headingChange', level: number): void
}>()



const editorRef = ref<HTMLDivElement | null>(null)


let editorView: EditorView | null = null


let isInternalChange = false


let isExternalSync = false


const themeCompartment = new Compartment()
const searchCompartment = new Compartment()


function resolveThemeExtension(name: string): Extension {
  switch (name) {
    case 'light':
      return []
    case 'one-dark':
    default:
      return oneDark
  }
}




const enterNoQuoteContinue: Command = (view) => {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  if (/^\s*>/.test(line.text)) {
    return insertNewlineAndIndent(view)
  }
  return insertNewlineContinueMarkup(view)
}


function createExtensions(): Extension[] {
  return [
    
    Prec.highest(
      keymap.of([
        { key: 'Enter', run: enterNoQuoteContinue },
      ]),
    ),

    
    lineNumbers(),

    
    highlightActiveLine(),

    
    markdown(),

    
    highlightDecorations,

    
    history(),

    
    keymap.of(defaultKeymap),

    
    keymap.of(historyKeymap),

    
    themeCompartment.of(resolveThemeExtension(props.theme ?? 'one-dark')),

    
    searchCompartment.of(searchHighlightExtensions),

    
    EditorView.lineWrapping,

    
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalChange = true
        const value = update.state.doc.toString()
        emit('update:modelValue', value, isExternalSync)
        isInternalChange = false
      }
      if (update.selectionSet || update.docChanged) {
        emit('headingChange', detectHeadingAtCursor(update.state))
      }
    }),
  ]
}



onMounted(() => {
  const container = editorRef.value
  if (!container) return

  
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: createExtensions(),
  })

  
  editorView = new EditorView({
    state,
    parent: container,
  })

  
  emit('ready', editorView)
})


watch(
  () => props.theme,
  (newTheme) => {
    const view = editorView
    if (!view) return
    view.dispatch({
      effects: themeCompartment.reconfigure(
        resolveThemeExtension(newTheme ?? 'one-dark'),
      ),
    })
  },
)


watch(
  () => props.modelValue,
  (newValue) => {
    const view = editorView
    if (!view || isInternalChange) return

    const currentValue = view.state.doc.toString()
    if (newValue !== currentValue) {
      isExternalSync = true
      try {
        view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: newValue,
          },
          
          annotations: Transaction.addToHistory.of(false),
        })
      } finally {
        isExternalSync = false
      }
    }
  },
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})




function detectHeadingAtCursor(state: EditorState): number {
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const match = line.text.match(/^(#{1,6})\s/)
  return match ? match[1].length : 0
}


function setCurrentLineHeading(level: number): void {
  const view = editorView
  if (!view) return

  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)

  
  const stripped = line.text.replace(/^#{1,6}\s*/, '')

  
  const newLine = level > 0 ? '#'.repeat(level) + ' ' + stripped : stripped

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLine },
    scrollIntoView: true,
  })
}


function getCurrentLineHeadingLevel(): number {
  const view = editorView
  if (!view) return 0
  return detectHeadingAtCursor(view.state)
}




function insertAtCursor(text: string): void {
  const view = editorView
  if (!view) return

  const { state } = view
  const changeSet = state.changeByRange((range) => ({
    changes: { from: range.from, to: range.to, insert: text },
    range: EditorSelection.range(range.from + text.length, range.from + text.length),
  }))

  view.dispatch({
    changes: changeSet.changes,
    selection: changeSet.selection,
    scrollIntoView: true,
  })
}


/**
 * 插入一段必须独占一行的块级内容（如图片 Markdown 语法）。
 * 若光标/选区所在行的前后还有非空白文本，则自动补换行，保证内容独占一行，
 * 否则布局引擎无法把它识别为块（会当成正文内联文本渲染）。
 */
function insertStandaloneBlock(text: string): void {
  const view = editorView
  if (!view) return

  const { state } = view
  const changeSet = state.changeByRange((range) => {
    const lineFrom = state.doc.lineAt(range.from)
    const lineTo = state.doc.lineAt(range.to)
    const beforeText = state.doc.sliceString(lineFrom.from, range.from)
    const afterText = state.doc.sliceString(range.to, lineTo.to)
    const needLead = beforeText.trim().length > 0
    const needTail = afterText.trim().length > 0
    const insertText = (needLead ? '\n' : '') + text + (needTail ? '\n' : '')
    const cursorPos = range.from + insertText.length
    return {
      changes: { from: range.from, to: range.to, insert: insertText },
      range: EditorSelection.range(cursorPos, cursorPos),
    }
  })

  view.dispatch({
    changes: changeSet.changes,
    selection: changeSet.selection,
    scrollIntoView: true,
  })
}


function stripInlineMarkdown(text: string): string {
  let result = text
  let changed = true

  while (changed) {
    changed = false
    const before = result

    
    result = result.replace(/\^([^^\n]+?)\^/g, '$1')

    if (result !== before) changed = true
  }

  return result
}


function wrapSelectionOrInsert(prefix: string, suffix: string, placeholder: string): void {
  const view = editorView
  if (!view) return

  const { state } = view
  const changeSet = state.changeByRange((range) => {
    const selectedText = state.doc.sliceString(range.from, range.to)

    if (selectedText) {
      
      const cleaned = stripInlineMarkdown(selectedText)
      const wrapped = prefix + cleaned + suffix
      const cursorPos = range.from + wrapped.length
      return {
        changes: { from: range.from, to: range.to, insert: wrapped },
        range: EditorSelection.range(cursorPos, cursorPos),
      }
    }

    
    const insertText = prefix + placeholder + suffix
    const placeholderStart = range.from + prefix.length
    const placeholderEnd = placeholderStart + placeholder.length
    return {
      changes: { from: range.from, to: range.to, insert: insertText },
      range: EditorSelection.range(placeholderStart, placeholderEnd),
    }
  })

  view.dispatch({
    changes: changeSet.changes,
    selection: changeSet.selection,
    scrollIntoView: true,
  })
}


function getSelectedText(): string {
  const view = editorView
  if (!view) return ''

  const { state } = view
  let selected = ''
  state.changeByRange((range) => {
    selected = state.doc.sliceString(range.from, range.to)
    return { range } 
  })
  return selected
}


function focus(): void {
  editorView?.focus()
}


function blur(): void {
  editorView?.contentDOM.blur()
}


function getValue(): string {
  return editorView ? editorView.state.doc.toString() : ''
}


function setValue(text: string): void {
  const view = editorView
  if (!view) return

  const currentValue = view.state.doc.toString()
  if (text !== currentValue) {
    isExternalSync = true
    try {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: text },
        annotations: Transaction.addToHistory.of(false),
      })
    } finally {
      isExternalSync = false
    }
  }
}


function getEditorView(): EditorView | null {
  return editorView
}


function undoEdit(): void {
  const view = editorView
  if (!view) return
  undo(view)
}


function redoEdit(): void {
  const view = editorView
  if (!view) return
  redo(view)
}




function setSearchHighlights(config: SearchHighlightConfig | null): void {
  applySearchHighlights(editorView, config)
}


function clearSearchHighlights(): void {
  applySearchHighlights(editorView, null)
}


function scrollToSearchMatch(from: number, to: number): void {
  scrollToMatch(editorView, from, to)
}

defineExpose({
  insertAtCursor,
  insertStandaloneBlock,
  wrapSelectionOrInsert,
  setCurrentLineHeading,
  getCurrentLineHeadingLevel,
  getSelectedText,
  focus,
  blur,
  getValue,
  setValue,
  getEditorView,
  undo: undoEdit,
  redo: redoEdit,
  setSearchHighlights,
  clearSearchHighlights,
  scrollToSearchMatch,
})
</script>

<style scoped>
.markdown-editor {
  height: 100%;
  width: 100%;
  overflow: clip;
}

.markdown-editor :deep(.cm-editor) {
  height: 100%;
  width: 100%;
}

.markdown-editor :deep(.cm-scroller) {
  overflow: auto;
  font-family:
    'JetBrains Mono',
    'Cascadia Code',
    'SF Mono',
    'Fira Code',
    'Consolas',
    monospace;
  font-size: 14px;
  line-height: 1.6;
}


.markdown-editor :deep(.cm-content) {
  overflow-wrap: anywhere;
}

.markdown-editor :deep(.cm-editor:focus),
.markdown-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

/* 暗色模式下行号列跟编辑器同色，不要留白 */
html[data-theme='dark'] .markdown-editor :deep(.cm-gutters),
html[data-theme='dark'] .markdown-editor :deep(.cm-lineNumbers) {
  background-color: #21252b !important;
  color: #7d8794 !important;
  border-right: 1px solid #2c313a;
}
html[data-theme='dark'] .markdown-editor :deep(.cm-activeLineGutter) {
  background-color: #2c313a !important;
  color: #d7dae0 !important;
}



.markdown-editor :deep(.cm-underline) {
  text-decoration: underline;
  text-decoration-color: var(--format-underline-color, var(--card-accent, currentColor));
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.markdown-editor :deep(.cm-format-bold) { color: var(--format-bold-color, inherit); }
.markdown-editor :deep(.cm-format-italic) { color: var(--format-italic-color, inherit); }
.markdown-editor :deep(.cm-format-strike) {
  text-decoration: line-through;
  text-decoration-color: var(--format-strike-color, currentColor);
  text-decoration-thickness: 1px;
}
.markdown-editor :deep(.cm-format-superscript) { color: var(--format-superscript-color, inherit); }
.markdown-editor :deep(.cm-format-subscript) { color: var(--format-subscript-color, inherit); }
.markdown-editor :deep(.cm-format-formula) { color: var(--format-formula-color, inherit); }



.markdown-editor :deep(.cm-search-match) {
  background-color: rgba(255, 200, 0, 0.35);
  border-radius: 2px;
  padding: 0 1px;
  margin: 0 -1px;
}

.markdown-editor :deep(.cm-search-match-active) {
  background-color: rgba(255, 140, 0, 0.55);
  border-radius: 2px;
  padding: 0 1px;
  margin: 0 -1px;
  outline: 2px solid rgba(255, 120, 0, 0.7);
  outline-offset: 0;
}
</style>
