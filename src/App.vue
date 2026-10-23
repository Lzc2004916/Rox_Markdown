<template>
  <ThemeProvider :theme-id="cardTheme">

  <!-- 下载页模式 -->
  <DownloadPage v-if="showDownloadPage" @back="showDownloadPage = false" />

  <!-- 主界面 -->
  <div v-else class="h-screen flex flex-col overflow-hidden bg-base-200">
    
    <div class="navbar bg-base-100 border-b border-base-300/60 z-20 shrink-0 min-h-0 py-0 h-11">
      <div class="navbar-start">
        <span class="text-primary font-bold text-lg ml-2 tracking-tight">Markdown Card</span>
      </div>

      <div class="navbar-center"></div>

      <div class="navbar-end">
        <!-- 离线模式常驻提示 -->
        <span v-if="auth.offline" class="text-xs text-amber-500 mr-3">离线模式</span>
        <!-- VIP剩余天数常驻显示 -->
        <span v-if="auth.isVip" class="text-xs text-amber-400 mr-3">
          {{ auth.vipType === 'LIFETIME' ? '永久VIP' : `剩余${auth.remainingTimeText}` }}
        </span>
        <span v-else class="text-xs text-base-400 mr-3">未激活</span>

        <button
          class="btn btn-ghost btn-sm mr-2 text-xs"
          @click="showDownloadPage = true"
        >
          <svg class="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
          </svg>
          下载最新版
        </button>

        <div v-if="isDesktopPlatform" class="flex items-center h-full win-controls" role="group" :aria-label="isMaximized ? '还原' : '最大化'">
          <button
            class="win-btn"
            aria-label="最小化"
            title="最小化"
            @click="handleMinimize"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button
            class="win-btn"
            :aria-label="isMaximized ? '还原' : '最大化'"
            :title="isMaximized ? '还原' : '最大化'"
            @click="handleToggleMaximize"
          >
            <svg v-if="!isMaximized" class="w-3.5 h-3.5" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
            <svg v-else class="w-3.5 h-3.5" viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="0.5" y="3" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button
            class="win-btn win-btn-close"
            aria-label="关闭"
            title="关闭"
            @click="handleCloseRequest"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>

    
    <DocumentTabs />

    
    <template v-if="isDesktopPlatform">
    <div class="flex-1 flex overflow-hidden relative">
      
      <div
        class="flex flex-col overflow-hidden border-r border-base-300 min-w-[200px] transition-all duration-300 ease-in-out"
        :class="{
          '!min-w-0 !border-r-0 -translate-x-full opacity-0 pointer-events-none': !leftPanelOpen
        }"
        :style="{ flexBasis: leftPanelOpen ? split + '%' : '0%' }"
      >
        <div class="h-9 shrink-0 bg-base-200/70 px-2 border-b border-base-300/60 flex items-center justify-between">
          <span class="text-xs font-medium opacity-60">Markdown 编辑</span>
          <button class="btn btn-ghost btn-sm gap-1" @click="toggleLeftPanel">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
            </svg>
            收起
          </button>
        </div>
        <EditorToolbar
          @insert="onToolbarInsert"
          @command="onToolbarCommand"
          @select-image="onSelectImage"
          :can-undo="canUndo"
          :can-redo="canRedo"
        />
        <div class="flex-1 min-h-0">
          <MarkdownEditor
            ref="editorRef"
            :modelValue="source"
            @update:modelValue="onSourceUpdate"
            :theme="editorTheme"
            :format-colors="formatColors"
            @ready="onEditorReady"
          />
        </div>
        
        <div class="h-7 shrink-0 flex items-center gap-3 px-3 text-xs text-base-content/60 bg-base-200/80 border-t border-base-300/60 select-none tabular-nums">
          <span>字数: {{ wordCount }}</span>
          <span>行数: {{ lineCount }}</span>
          <template v-if="activeTags.length > 0">
            <span v-for="tag in activeTags" :key="tag" class="badge badge-xs badge-ghost">{{ tag }}</span>
          </template>
        </div>
      </div>

      <!-- 左边收起后的悬浮展开按钮 -->
      <button
        v-if="!leftPanelOpen"
        class="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-base-200 shadow-lg border border-base-300 flex items-center justify-center cursor-pointer transition-all hover:bg-base-300 hover:border-base-400"
        @click="toggleLeftPanel"
        title="展开编辑栏"
      >
        <svg class="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>

      
      <div
        class="w-1 cursor-col-resize select-none shrink-0 z-10 transition-all duration-300 drag-bar"
        :class="dragging ? 'bg-primary' : 'bg-base-300'"
        @mousedown="onDragStart"
        v-show="leftPanelOpen"
      ></div>

      
      <div
        class="flex flex-col min-w-[200px] min-h-0 overflow-hidden"
        :style="{ flexBasis: `calc(100% - ${leftPanelOpen ? split : 0}% - ${rightPanelOpen ? rightSplit : 0}%)` }"
      >
        <div class="h-9 shrink-0 bg-base-200/70 px-4 border-b border-base-300/60 text-xs font-medium flex items-center justify-between">
          <span class="opacity-50">滚轮横滑翻页 · Ctrl+滚轮缩放</span>
          <span class="flex items-center gap-2">
            <button
              class="btn btn-ghost btn-xs btn-circle"
              title="排版异常时点此重排"
              :disabled="reloading"
              @click="onRelayout"
            >
              <svg v-if="!reloading" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 1.44 4"/>
                <path d="M21 3v6h-6"/>
              </svg>
              <span v-else class="loading loading-spinner loading-xs"></span>
            </button>
            <span class="opacity-40 tabular-nums">{{ Math.round(previewScale * 100) }}%</span>
          </span>
        </div>
        <div
          ref="previewContainerRef"
          class="flex-1 min-h-0 overflow-auto bg-base-200/60 bg-dot-pattern"
          @wheel="onPreviewWheel"
        >
          <CardPreview
            ref="cardPreviewRef"
            :key="relayoutKey"
            v-model:current-page="currentPage"
            @update:imageMaxHeights="imageMaxHeights = $event"
            :source="source"
            :theme-id="cardTheme"
            :typography="typography"
            :format-colors="formatColors"
            :footer-enabled="footerEnabled"
            :footer-left="footerLeft"
            :footer-background-enabled="footerBackgroundEnabled"
            :footer-background-color="footerBackgroundColor"
            :footer-text-color="footerTextColor"
            :footer-font-size="footerFontSize"
            :footer-font-weight="footerFontWeight"
            :gradient-config="gradientConfig"
            :card-corner-mode="cardCornerMode"
            :preview-scale="previewScale"
            :heading-overrides="headingOverrides"
            :body-text-color="bodyTextColor"
          />
        </div>
      </div>

      
      <div
        class="w-1 cursor-col-resize select-none shrink-0 z-10 transition-all duration-300 drag-bar"
        :class="draggingRight ? 'bg-primary' : 'bg-base-300'"
        @mousedown="onDragStartRight"
        v-show="rightPanelOpen"
      ></div>

      
      <div
        class="min-w-[240px] flex flex-col overflow-hidden bg-base-100 transition-all duration-300 ease-in-out"
        :class="{
          '!min-w-0 translate-x-full opacity-0 pointer-events-none': !rightPanelOpen
        }"
        :style="{ flexBasis: rightPanelOpen ? rightSplit + '%' : '0%' }"
      >
        <div class="h-9 shrink-0 bg-base-200/70 px-4 border-b border-base-300/60 text-xs font-medium flex items-center justify-between">
          <span class="opacity-60">卡片设置</span>
          <button class="btn btn-ghost btn-sm gap-1" @click="toggleRightPanel">
            收起
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
        <ControlPanel
          :app-theme="appTheme"
          @update:app-theme="(v: 'light' | 'dark') => { appTheme = v; applyAppTheme() }"
          :card-theme="cardTheme"
          @update:card-theme="selectTheme"
          :body-font-mode="bodyFontMode"
          @update:body-font-mode="(v: string) => bodyFontMode = v as BodyFontMode"
          :body-font-size="bodyFontSize"
          @update:body-font-size="bodyFontSize = $event"
          :body-font-weight="bodyFontWeight"
          @update:body-font-weight="bodyFontWeight = $event"
          :format-colors="formatColors"
          @update:format-colors="formatColors = $event"
          :footer-enabled="footerEnabled"
          :footer-left="footerLeft"
          :footer-background-enabled="footerBackgroundEnabled"
          :footer-background-color="footerBackgroundColor"
          :footer-text-color="footerTextColor"
          :footer-font-size="footerFontSize"
          :footer-font-weight="footerFontWeight"
          @update:footer-enabled="footerEnabled = $event"
          @update:footer-left="footerLeft = $event"
          @update:footer-background-enabled="footerBackgroundEnabled = $event"
          @update:footer-background-color="footerBackgroundColor = $event"
          @update:footer-text-color="footerTextColor = $event"
          @update:footer-font-size="footerFontSize = $event"
          @update:footer-font-weight="footerFontWeight = $event"
          :gradient-config="gradientConfig"
          @update:gradient-config="gradientConfig = $event"
          :card-corner-mode="cardCornerMode"
          @update:card-corner-mode="cardCornerMode = $event"
          :preview-scale="previewScale"
          @update:preview-scale="previewScale = $event"
          :font-options="BODY_FONT_OPTIONS"
          :is-exporting="isExporting"
          :progress="progress"
          :body-text-color="bodyTextColor"
          @update:body-text-color="bodyTextColor = $event"
          :images="imageItems"
          @update:imageHeight="onImageHeightChange"
          @export-png="handleBatchExportPNG"
          @export-jpg="handleBatchExportJPG"
          @export-pdf="handleExportPDF"
          @need-activate="showActivationDialog = true"
        />
        </div>
      </div>
    </div>

    <!-- 右边收起后的悬浮展开按钮 -->
    <button
      v-if="!rightPanelOpen"
      class="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-base-200 shadow-lg border border-base-300 flex items-center justify-center cursor-pointer transition-all hover:bg-base-300 hover:border-base-400"
      @click="toggleRightPanel"
      title="展开设置面板"
    >
      <svg class="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.636 2.698 2.37-.67 1.744.337 3.843 1.722 4.726 1.403.88 1.403 2.975 0 3.854-1.385.887-2.392 2.986-1.722 4.726.612 1.734-1.155 3.31-2.698 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.636-2.698-2.37.67-1.744-.337-3.843-1.722-4.726-1.403-.88-1.403-2.975 0-3.854 1.385-.887 2.392-2.986 1.722-4.726-.612-1.734 1.155-3.31 2.698-2.37a1.724 1.724 0 002.573-1.066z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>
    </template>

    
    <MobileLayout
      v-else
      ref="mobileLayoutRef"
      :source="source"
      :editor-theme="editorTheme"
      :format-colors="formatColors"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :card-theme="cardTheme"
      :app-theme="appTheme"
      :typography="typography"
      :footer-enabled="footerEnabled"
      :footer-left="footerLeft"
      :footer-background-enabled="footerBackgroundEnabled"
      :footer-background-color="footerBackgroundColor"
      :footer-text-color="footerTextColor"
      :footer-font-size="footerFontSize"
      :footer-font-weight="footerFontWeight"
      :gradient-config="gradientConfig"
      :card-corner-mode="cardCornerMode"
      :preview-scale="previewScale"
      :heading-overrides="headingOverrides"
      :active-tags="activeTags"
      :word-count="wordCount"
      :line-count="lineCount"
      :is-exporting="isExporting"
      :progress="progress"
      :font-options="BODY_FONT_OPTIONS"
      :body-font-mode="bodyFontMode"
      :body-font-size="bodyFontSize"
      :body-font-weight="bodyFontWeight"
      :body-text-color="bodyTextColor"
      :images="imageItems"
      @update:source="onSourceUpdate"
      @toolbar-insert="onToolbarInsert"
      @toolbar-command="onToolbarCommand"
      @update:app-theme="(v: 'light' | 'dark') => { appTheme = v; applyAppTheme() }"
      @update:card-theme="selectTheme"
      @update:body-font-mode="(v: string) => bodyFontMode = v as BodyFontMode"
      @update:body-font-size="(v: number) => bodyFontSize = v"
      @update:body-font-weight="(v: number) => bodyFontWeight = v"
      @update:format-colors="(v) => formatColors = v"
      @update:footer-enabled="(v: boolean) => footerEnabled = v"
      @update:footer-left="(v: string) => footerLeft = v"
      @update:footer-background-enabled="(v: boolean) => footerBackgroundEnabled = v"
      @update:footer-background-color="(v: string | null) => footerBackgroundColor = v"
      @update:footer-text-color="(v: string | null) => footerTextColor = v"
      @update:footer-font-size="(v: number) => footerFontSize = v"
      @update:footer-font-weight="(v: number) => footerFontWeight = v"
      @update:gradient-config="(v: GradientConfig) => gradientConfig = v"
      @update:card-corner-mode="cardCornerMode = $event"
      @update:preview-scale="(v: number) => previewScale = v"
      @update:body-text-color="(v: string | null) => bodyTextColor = v"
      @update:imageHeight="onImageHeightChange"
      @export-png="handleBatchExportPNG"
      @export-jpg="handleBatchExportJPG"
      @export-pdf="handleExportPDF"
      @need-activate="showActivationDialog = true"
    />

    
    <DraftRecoveryModal
      v-if="showDraftModal"
      @restore="onDraftRestore"
      @discard="onDraftDiscard"
    />

    
    <SearchDialog
      ref="searchDialogRef"
      :visible="showSearchDialog"
      @update:visible="showSearchDialog = $event"
      @search="onSearch"
      @next="onSearchNext"
      @prev="onSearchPrev"
      @close="onSearchClose"
    />

    
    <dialog
      ref="closeDialogRef"
      class="modal"
      aria-label="确认关闭"
      @close="onCloseDialogDismiss"
    >
      <div class="modal-box w-96 max-w-[90vw]">
        <h3 id="close-dialog-title" class="font-bold text-base mb-3">确认关闭</h3>
        <p class="text-sm text-base-content/80 mb-5">确定要关闭窗口吗？未保存的更改将丢失。</p>
        <div class="modal-action mt-0 gap-2">
          <button
            ref="cancelBtnRef"
            class="btn btn-sm btn-ghost"
            @click="handleCancelClose"
          >取消</button>
          <button
            ref="confirmBtnRef"
            class="btn btn-sm btn-error"
            @click="handleConfirmClose"
          >确定关闭</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>取消</button>
      </form>
    </dialog>

    <ActivationDialog
      :visible="showActivationDialog"
      @close="showActivationDialog = false"
      @success="onActivateSuccess"
    />

    <ToastContainer />
  </div>
  </ThemeProvider>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { EditorView } from '@codemirror/view'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import type { ToolbarItem } from '@/components/editor/EditorToolbar.vue'
import CardPreview from '@/components/preview/CardPreview.vue'
import ThemeProvider from '@/components/theme/ThemeProvider.vue'
import DocumentTabs from '@/components/DocumentTabs.vue'
import ControlPanel from '@/components/settings/ControlPanel.vue'
import type { ImageItem } from '@/components/settings/ControlPanel.vue'
import { useMarkdown } from '@/composables/useMarkdown'
import { useExport } from '@/composables/useExport'
import { useDocumentsStore } from '@/stores/documents'
import { useDrafts, type AppSettings } from '@/composables/useDrafts'
import { BODY_FONT_MODES, THEMES, getTheme, normalizeBodyFontMode, type BodyFontMode, parseImages, setImageHeight, nextImageKey, IMAGE_HEIGHT_MAX } from '@/card'
import { clearMeasureCaches } from '@/card/measure'
import DraftRecoveryModal from '@/components/DraftRecoveryModal.vue'
import type { GradientConfig } from '@/card'
import type { TypographySettings, SubheadingStyle, HeadingStyleOverrides, InlineFormatColors } from '@/card'
import { useSettings } from '@/composables/useSettings'
import { useSearch, type SearchMatch } from '@/composables/useSearch'
import SearchDialog from '@/components/editor/SearchDialog.vue'
import ActivationDialog from '@/components/theme/ActivationDialog.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import DownloadPage from '@/components/preview/DownloadPage.vue'
import { useAuthStore } from '@/stores/auth'
import { checkThemeAccess } from '@/api/theme'
import { toast } from '@/utils/toast'
import { isSupportedImage, normalizeImagePath, IMAGE_EXTENSIONS_LABEL } from '@/utils/image'
import { isDesktop } from '@/platforms/detection'
import MobileLayout from '@/layouts/MobileLayout.vue'



const isDesktopPlatform = isDesktop()

const appTheme = ref<'light' | 'dark'>(
  (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light',
)

function applyAppTheme(): void {
  document.documentElement.setAttribute('data-theme', appTheme.value)
}

function refreshVipCountdown(): void {
  if (document.visibilityState === 'visible') auth.refreshCountdown()
}

onMounted(async () => {
  applyAppTheme()
  document.addEventListener('visibilitychange', refreshVipCountdown)
  // 校验登录状态，不主动弹激活窗，用户点VIP主题时再弹
  await auth.initFromStorage()

  // Drafts created before per-document themes may contain an unavailable or
  // deleted theme. Normalize those values after the paid-theme list is known.
  const knownThemeIds = new Set(THEMES.map((theme) => theme.id))
  let activeThemeWasReset = false
  for (const document of store.documents) {
    const unavailable = !knownThemeIds.has(document.cardTheme) ||
      (auth.isPaidTheme(document.cardTheme) && !auth.isVip)
    if (!unavailable) continue
    store.updateTheme(document.id, 'warm-editor')
    activeThemeWasReset ||= document.id === store.activeId
  }
  if (activeThemeWasReset) applyThemePreset('warm-editor')
})

// 切换主题：付费主题先调后端校验，防止前端以为还是VIP但实际已过期
async function selectTheme(newThemeId: string): Promise<void> {
  const targetDocumentId = store.activeId
  if (!targetDocumentId) return

  const applyToTargetDocument = (themeId: string): void => {
    if (!store.documents.some((document) => document.id === targetDocumentId)) return
    store.updateTheme(targetDocumentId, themeId)
    // Theme presets are global editor defaults; only apply them while the
    // original document is still active.
    if (store.activeId === targetDocumentId) applyThemePreset(themeId)
  }

  // 免费主题直接切
  if (!auth.isPaidTheme(newThemeId)) {
    applyToTargetDocument(newThemeId)
    return
  }

  // 离线时使用本地缓存的到期时间判断权限
  if (auth.offline) {
    if (auth.isVip) {
      applyToTargetDocument(newThemeId)
    } else {
      auth.markExpired()
      applyToTargetDocument('warm-editor')
      showActivationDialog.value = true
    }
    return
  }

  try {
    // 调后端校验权限
    await checkThemeAccess(newThemeId)
    applyToTargetDocument(newThemeId)
  } catch (e: any) {
    // 校验失败（过期/无权限）：直接在当前上下文处理，保证UI响应式更新
    console.debug('主题校验失败', e)
    // 立刻重置VIP状态，UI马上同步
    auth.markExpired()
    // 自动切回免费主题
    applyToTargetDocument('warm-editor')
    // 自动弹激活窗
    setTimeout(() => {
      showActivationDialog.value = true
    }, 500)
  }
}



const store = useDocumentsStore()
const auth = useAuthStore()
const showActivationDialog = ref(false)
const showDownloadPage = ref(false)



const { hasDrafts, restore, discard, dismissPrompt, saveSettings } = useDrafts()
const showDraftModal = ref<boolean>(false)

if (hasDrafts()) {
  showDraftModal.value = true
} else {
  store.init()
}

function onDraftRestore(): void {
  const settings = restore()
  applySettings(settings)
  showDraftModal.value = false
}

function onDraftDiscard(): void {
  discard()
  dismissPrompt()
  showDraftModal.value = false
  store.init()
}



const source = computed<string>({
  get: () => store.activeDocument?.content ?? '',
  set: (value: string) => {
    if (store.activeId) store.updateContent(store.activeId, value)
  },
})

const activeTags = computed<string[]>(() => store.activeDocument?.tags ?? [])


const canUndo = computed<boolean>(() => store.activeId ? store.canUndo(store.activeId) : false)


const canRedo = computed<boolean>(() => store.activeId ? store.canRedo(store.activeId) : false)

const cardTheme = computed<string>({
  get: () => store.activeDocument?.cardTheme ?? 'warm-editor',
  set: (themeId: string) => {
    if (store.activeId) store.updateTheme(store.activeId, themeId)
  },
})

const formatColors = computed<InlineFormatColors>({
  get: () => store.activeDocument?.formatColors ?? {},
  set: (colors) => {
    if (store.activeId) store.updateFormatColors(store.activeId, colors)
  },
})

const footerLeft = computed<string>({
  get: () => store.activeDocument?.footerLeft ?? '',
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerLeft: value }) },
})
const footerBackgroundEnabled = computed<boolean>({
  get: () => store.activeDocument?.footerBackgroundEnabled ?? true,
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerBackgroundEnabled: value }) },
})
const footerBackgroundColor = computed<string | null>({
  get: () => store.activeDocument?.footerBackgroundColor ?? null,
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerBackgroundColor: value }) },
})
const footerTextColor = computed<string | null>({
  get: () => store.activeDocument?.footerTextColor ?? null,
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerTextColor: value }) },
})
const footerFontSize = computed<number>({
  get: () => Math.min(32, Math.max(10, store.activeDocument?.footerFontSize ?? 14)),
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerFontSize: Math.min(32, Math.max(10, value)) }) },
})
const footerFontWeight = computed<number>({
  get: () => store.activeDocument?.footerFontWeight ?? 600,
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerFontWeight: [400, 500, 600, 700, 800].includes(value) ? value : 600 }) },
})

// ── 图片高度滑块相关状态 ──────────────────────────────────────────
// CardPreview 每次排版后回填：key -> 该图所在页的可用高度上限
const imageMaxHeights = ref<Record<string, number>>({})

// 从 markdown 扫描出的图片项（key + 高度 + 动态上限）
const imageItems = computed<ImageItem[]>(() => {
  return parseImages(source.value).map((it) => {
    const n = /^img(\d+)$/.exec(it.key)?.[1] ?? it.key
    return {
      key: it.key,
      label: `图${n}`,
      filename: it.alt || '',
      height: it.height,
      maxHeight: imageMaxHeights.value[it.key] ?? IMAGE_HEIGHT_MAX,
    }
  })
})

// 滑块拖动：改写对应图片的 {height=}
function onImageHeightChange(key: string, height: number): void {
  const next = setImageHeight(source.value, key, height)
  if (next !== source.value) source.value = next
}

// 排版回填上限后，若某图当前高度超出上限（主题切换/内容变化导致），自动 clamp 并提示
watch(imageMaxHeights, (maxes) => {
  let next = source.value
  let changed = false
  for (const it of parseImages(source.value)) {
    const mx = maxes[it.key]
    if (mx != null && it.height > mx) {
      next = setImageHeight(next, it.key, mx)
      changed = true
    }
  }
  if (changed && next !== source.value) {
    source.value = next
    toast.info('部分图片高度已按当前卡片可用空间自动调整')
  }
})
// 左右面板抽屉开关，默认都展开
const leftPanelOpen = ref(true)
const rightPanelOpen = ref(true)

// 切换左面板
function toggleLeftPanel() {
  leftPanelOpen.value = !leftPanelOpen.value
}

// 切换右面板
function toggleRightPanel() {
  rightPanelOpen.value = !rightPanelOpen.value
}
const bodyFontMode = ref<BodyFontMode>('wenkai')


const editorTheme = computed<string>(() => {
  return appTheme.value === 'dark' ? 'one-dark' : 'light'
})


function applyThemePreset(newThemeId: string): void {
  const theme = getTheme(newThemeId)
  if (theme.editor.bodyFontMode) {
    bodyFontMode.value = theme.editor.bodyFontMode
  }
  settings.clearHeadingColors()
  settings.headingH1Size.value = null
  settings.headingH2Size.value = null
  settings.headingH3Size.value = null
  settings.headingH4Size.value = null
  settings.headingH5Size.value = null
  settings.headingH6Size.value = null
  if (theme.gradient) {
    gradientConfig.value = {
      enabled: gradientConfig.value.enabled,
      color1: theme.gradient.color1,
      color2: theme.gradient.color2,
      angle: theme.gradient.angle ?? 135,
    }
  }
}

const BODY_FONT_OPTIONS = Object.entries(BODY_FONT_MODES).map(([id, def]) => ({
  id,
  label: def.label,
  family: def.family,
  category: def.category,
  description: def.description,
  sample: def.sample,
}))





const settings = useSettings()
const cardCornerMode = settings.cardCornerMode
const bodyFontSize = ref<number>(30)
const bodyFontWeight = ref<number>(400)
const footerEnabled = computed<boolean>({
  get: () => store.activeDocument?.footerEnabled ?? false,
  set: (value) => { if (store.activeId) store.updateFooterSettings(store.activeId, { footerEnabled: value }) },
})
const gradientConfig = ref<GradientConfig>({
  enabled: false,
  color1: '#6c5ce7',
  color2: '#a29bfe',
  angle: 135,
})
const previewScale = ref<number>(0.65)
const previewContainerRef = ref<HTMLDivElement | null>(null)
const relayoutKey = ref<number>(0)
const reloading = ref(false)

async function onRelayout() {
  if (reloading.value) return
  reloading.value = true
  clearMeasureCaches()
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* ignore */ }
  }
  relayoutKey.value++
  setTimeout(() => { reloading.value = false }, 500)
}


const bodyTextColor = ref<string | null>(settings.bodyTextColor.value ?? null)


watch(bodyTextColor, (v) => { settings.bodyTextColor.value = v })




function onPreviewWheel(e: WheelEvent): void {
  if (!e.ctrlKey && !e.metaKey) return  
  e.preventDefault()
  const step = 0.05
  const delta = e.deltaY < 0 ? step : -step
  const newScale = Math.max(0.25, Math.min(2.5, previewScale.value + delta))
  previewScale.value = Math.round(newScale * 100) / 100
}



const split = ref<number>(32)
const rightSplit = ref<number>(22)
const dragging = ref<boolean>(false)
const draggingRight = ref<boolean>(false)



const isMaximized = ref(false)
const showCloseDialog = ref(false)
const closeDialogRef = ref<HTMLDialogElement | null>(null)
const cancelBtnRef = ref<HTMLButtonElement | null>(null)
const confirmBtnRef = ref<HTMLButtonElement | null>(null)
const windowControlCleanups: (() => void)[] = []

function initWindowControls(): void {
  if (!window.electronAPI) return

  window.electronAPI.getWindowState().then((state: { isMaximized: boolean }) => {
    isMaximized.value = state.isMaximized
  })

  windowControlCleanups.push(
    window.electronAPI.onWindowStateChanged((state: { isMaximized: boolean }) => {
      isMaximized.value = state.isMaximized
    }),
  )

  windowControlCleanups.push(
    window.electronAPI.onCloseRequest(() => {
      showCloseDialog.value = true
    }),
  )

  
  windowControlCleanups.push(
    window.electronAPI.onSearchOpen(() => {
      showSearchDialog.value = true
    }),
  )
}

watch(showCloseDialog, (visible) => {
  if (!closeDialogRef.value) return
  if (visible) {
    closeDialogRef.value.showModal()
    requestAnimationFrame(() => confirmBtnRef.value?.focus())
  } else {
    closeDialogRef.value.close()
  }
})

function handleMinimize(): void {
  window.electronAPI?.minimizeWindow()
}

function handleToggleMaximize(): void {
  window.electronAPI?.toggleMaximize()
}

function handleCloseRequest(): void {
  showCloseDialog.value = true
}

function handleConfirmClose(): void {
  showCloseDialog.value = false
  window.electronAPI?.confirmClose()
}

function handleCancelClose(): void {
  showCloseDialog.value = false
}

function onCloseDialogDismiss(): void {
  showCloseDialog.value = false
}

function onActivateSuccess(): void {
  // 激活成功后，如果用户之前点了某个 VIP 主题，自动切过去
  if (auth.pendingTheme) {
    const themeId = auth.pendingTheme
    if (store.activeId) {
      store.updateTheme(store.activeId, themeId)
      applyThemePreset(themeId)
    }
    auth.pendingTheme = null
  }
}

onMounted(() => {
  initWindowControls()

  
  nextTick(() => {
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('app-render-ready'))
      })
    })
  })
})

const typography = computed<TypographySettings>(() => {
  const theme = getTheme(cardTheme.value)
  return {
    bodySize: bodyFontSize.value,
    lineHeight: 1.84,
    bodyFontMode: bodyFontMode.value,
    bodyFontWeight: bodyFontWeight.value,
    subheadingStyle: (theme.editor.subheadingStyle ?? 'large') as SubheadingStyle,
  }
})



const headingOverrides = computed<HeadingStyleOverrides>(() => ({
  h1Size: settings.headingH1Size.value,
  h2Size: settings.headingH2Size.value,
  h3Size: settings.headingH3Size.value,
  h4Size: settings.headingH4Size.value,
  h5Size: settings.headingH5Size.value,
  h6Size: settings.headingH6Size.value,
  h1Align: settings.headingH1Align.value,
  h1Color: settings.headingH1Color.value,
  h2Color: settings.headingH2Color.value,
  h3Color: settings.headingH3Color.value,
  h4Color: settings.headingH4Color.value,
  h5Color: settings.headingH5Color.value,
  h6Color: settings.headingH6Color.value,
  h1Stroke: settings.headingH1Stroke.value,
  h2Stroke: settings.headingH2Stroke.value,
  h3Stroke: settings.headingH3Stroke.value,
  h4Stroke: settings.headingH4Stroke.value,
  h5Stroke: settings.headingH5Stroke.value,
  h6Stroke: settings.headingH6Stroke.value,
  h1StrokeWidth: settings.headingH1StrokeWidth.value,
  h2StrokeWidth: settings.headingH2StrokeWidth.value,
  h3StrokeWidth: settings.headingH3StrokeWidth.value,
  h4StrokeWidth: settings.headingH4StrokeWidth.value,
  h5StrokeWidth: settings.headingH5StrokeWidth.value,
  h6StrokeWidth: settings.headingH6StrokeWidth.value,
}))



const { currentPage } = useMarkdown(source)



const lineCount = ref(0)
const wordCount = ref(0)
let statsDebounceTimer: ReturnType<typeof setTimeout> | null = null

function computeStats(content: string): void {
  lineCount.value = content.split(/\r?\n/).length
  const text = content.trim()
  wordCount.value = text ? text.split(/\s+/).length : 0
}


watch(source, (val) => {
  if (statsDebounceTimer) clearTimeout(statsDebounceTimer)
  statsDebounceTimer = setTimeout(() => computeStats(val), 300)
}, { immediate: true })



function onDragStart(event: MouseEvent): void {
  event.preventDefault()
  dragging.value = true
  const onMouseMove = (e: MouseEvent): void => {
    const pct = (e.clientX / window.innerWidth) * 100
    
    const maxLeft = Math.min(60, 100 - rightSplit.value - 18)
    split.value = Math.max(16, Math.min(maxLeft, Math.round(pct)))
  }
  const onMouseUp = (): void => {
    dragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}



function onDragStartRight(event: MouseEvent): void {
  event.preventDefault()
  draggingRight.value = true
  const onMouseMove = (e: MouseEvent): void => {
    const rightEdgePct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100
    
    const maxRight = Math.min(40, 100 - split.value - 18)
    rightSplit.value = Math.max(16, Math.min(maxRight, Math.round(rightEdgePct)))
  }
  const onMouseUp = (): void => {
    draggingRight.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}




function collectSettings(): AppSettings {
  return {
    cardTheme: cardTheme.value,
    bodyFontMode: bodyFontMode.value,
    bodyFontSize: bodyFontSize.value,
    bodyFontWeight: bodyFontWeight.value,
    footerEnabled: footerEnabled.value,
    split: split.value,
    rightSplit: rightSplit.value,
    previewScale: previewScale.value,
    gradientConfig: { ...gradientConfig.value },
    bodyTextColor: bodyTextColor.value,
  }
}


function applySettings(s: AppSettings): void {
  bodyFontMode.value = normalizeBodyFontMode(s.bodyFontMode)
  bodyFontSize.value = s.bodyFontSize
  bodyFontWeight.value = s.bodyFontWeight ?? 400
  footerEnabled.value = s.footerEnabled
  split.value = s.split
  rightSplit.value = s.rightSplit ?? 22
  previewScale.value = s.previewScale ?? 0.65
  if (s.gradientConfig) {
    gradientConfig.value = { ...s.gradientConfig }
  }
  if (s.bodyTextColor !== undefined) {
    bodyTextColor.value = s.bodyTextColor ?? null
  }
}


watch(
  [
    cardTheme, bodyFontMode, bodyFontSize, bodyFontWeight,
    footerEnabled, split, rightSplit, previewScale, gradientConfig, bodyTextColor,
  ],
  () => saveSettings(collectSettings()),
  { deep: false },
)



interface MarkdownEditorAPI {
  insertAtCursor: (text: string) => void
  insertStandaloneBlock: (text: string) => void
  wrapSelectionOrInsert: (prefix: string, suffix: string, placeholder: string) => void
  focus: () => void
  undo: () => void
  redo: () => void
  setValue: (text: string) => void
  getEditorView: () => EditorView | null
  setSearchHighlights: (config: { matches: { from: number; to: number }[]; activeIndex: number } | null) => void
  clearSearchHighlights: () => void
  scrollToSearchMatch: (from: number, to: number) => void
}

const editorRef = ref<MarkdownEditorAPI | null>(null)


const mobileLayoutRef = ref<{
  editorRef: MarkdownEditorAPI | null
  cardPreviewRef: unknown
} | null>(null)


const activeEditor = computed<MarkdownEditorAPI | null>(() =>
  isDesktopPlatform ? editorRef.value : (mobileLayoutRef.value?.editorRef ?? null),
)


let isUndoRedoing = false

function onSourceUpdate(value: string, external = false): void {
  
  
  if (store.activeId && !isUndoRedoing && !external) {
    const doc = store.activeDocument
    if (doc && doc.content !== value) {
      store.pushUndo(store.activeId, doc.content)
    }
  }
  source.value = value
}

function onEditorReady(_view: EditorView): void {}



function onToolbarInsert(item: ToolbarItem): void {
  if (item.block) {
    activeEditor.value?.insertStandaloneBlock(item.template)
  } else if (item.wrap) {
    activeEditor.value?.wrapSelectionOrInsert(item.wrap.prefix, item.wrap.suffix, item.wrap.placeholder)
  } else {
    activeEditor.value?.insertAtCursor(item.template)
  }
  activeEditor.value?.focus()
}

// 选择本地图片并插入
async function onSelectImage() {
  if (!window.electronAPI?.selectImage) {
    toast.error('当前环境不支持插入本地图片')
    return
  }

  let result: { path: string; name: string } | null = null
  try {
    result = await window.electronAPI.selectImage()
  } catch {
    toast.error('图片选择失败，请重试')
    return
  }

  if (!result) return // 用户取消：不插入任何内容，不弹提示

  if (!result.path) {
    toast.error('图片路径获取失败，请重试')
    return
  }

  // 插入前校验格式（对话框过滤器之外的兜底：用户可手动输入文件名）
  if (!isSupportedImage(result.path)) {
    toast.error(`仅支持图片格式（${IMAGE_EXTENSIONS_LABEL}）`)
    return
  }

  // Markdown 里写绝对路径（正斜杠化）；预览渲染时再转成 rox-image:// 加载。
  // 用 insertStandaloneBlock 保证图片代码独占一行，否则布局引擎识别不到图片块。
  // 默认高度200px；每张图分配唯一 key（{#imgN}），供高度滑块独立寻址。
  const key = nextImageKey(source.value)
  const text = `![${result.name}](${normalizeImagePath(result.path)}){#${key}}{height=200}`
  activeEditor.value?.insertStandaloneBlock(text)
  activeEditor.value?.focus()
  toast.success('图片已插入')
}

function onToolbarCommand(action: 'undo' | 'redo'): void {
  if (!store.activeId) return

  isUndoRedoing = true
  try {
    if (action === 'undo') {
      
      const restored = store.undo(store.activeId)
      if (restored !== null) {
        activeEditor.value?.setValue(restored)
      } else {
        
        activeEditor.value?.undo()
      }
    } else if (action === 'redo') {
      const restored = store.redo(store.activeId)
      if (restored !== null) {
        activeEditor.value?.setValue(restored)
      } else {
        activeEditor.value?.redo()
      }
    }
  } finally {
    isUndoRedoing = false
  }
  activeEditor.value?.focus()
}

interface CardPreviewAPI {
  getActiveCanvas: () => HTMLCanvasElement | null
  getAllCanvases: () => HTMLCanvasElement[]
  getPageCount: () => number
  forceRender: () => void
}

const cardPreviewRef = ref<CardPreviewAPI | null>(null)

const { isExporting, progress, exportBatchPNG, exportBatchJPG, exportMultiPDF } =
  useExport()

async function handleBatchExportPNG(): Promise<void> {
  const canvases = cardPreviewRef.value?.getAllCanvases()
  if (!canvases || canvases.length === 0) return
  try { await exportBatchPNG(canvases) } catch (e) { console.error('Batch PNG export failed:', e) }
}

async function handleBatchExportJPG(): Promise<void> {
  const canvases = cardPreviewRef.value?.getAllCanvases()
  if (!canvases || canvases.length === 0) return
  try { await exportBatchJPG(canvases) } catch (e) { console.error('Batch JPG export failed:', e) }
}

async function handleExportPDF(): Promise<void> {
  const canvases = cardPreviewRef.value?.getAllCanvases()
  if (!canvases || canvases.length === 0) return
  try {
    await exportMultiPDF(canvases, { w: 720, h: 960 })
  } catch (e) {
    console.error('PDF export failed:', e)
  }
}



const showSearchDialog = ref(false)
const searchDialogRef = ref<{ updateResults: (activeIndex: number, total: number) => void; focus: () => void } | null>(null)

const search = useSearch()


function syncSearchHighlights(): void {
  const view = activeEditor.value?.getEditorView?.()
  if (!view) return

  if (search.matches.value.length === 0) {
    activeEditor.value?.clearSearchHighlights?.()
    return
  }

  activeEditor.value?.setSearchHighlights?.({
    matches: search.matches.value.map((m: SearchMatch) => ({ from: m.from, to: m.to })),
    activeIndex: search.activeIndex.value,
  })
}


function scrollToActiveMatch(): void {
  const match = search.matches.value[search.activeIndex.value]
  if (!match) return
  activeEditor.value?.scrollToSearchMatch?.(match.from, match.to)
}

function onSearch(
  query: string,
  opts: { contentOnly: boolean; caseSensitive: boolean },
): void {
  search.search(query, source.value, opts)
  syncSearchHighlights()
  scrollToActiveMatch()
  
  searchDialogRef.value?.updateResults(
    search.activeIndex.value,
    search.total.value,
  )
}

function onSearchNext(): void {
  search.next()
  syncSearchHighlights()
  scrollToActiveMatch()
  searchDialogRef.value?.updateResults(
    search.activeIndex.value,
    search.total.value,
  )
}

function onSearchPrev(): void {
  search.prev()
  syncSearchHighlights()
  scrollToActiveMatch()
  searchDialogRef.value?.updateResults(
    search.activeIndex.value,
    search.total.value,
  )
}

function onSearchClose(): void {
  showSearchDialog.value = false
  search.clear()
  activeEditor.value?.clearSearchHighlights?.()
}



function onKeydown(e: KeyboardEvent): void {
  
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    e.preventDefault()
    store.addDocument()
    return
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    showSearchDialog.value = true
    return
  }
}

window.addEventListener('keydown', onKeydown)



onBeforeUnmount(() => {
  dragging.value = false
  draggingRight.value = false
  if (statsDebounceTimer) clearTimeout(statsDebounceTimer)
  document.removeEventListener('visibilitychange', refreshVipCountdown)
  window.removeEventListener('keydown', onKeydown)
  windowControlCleanups.forEach((fn) => fn())
})
</script>

<style scoped>


.win-btn {
  @apply relative inline-flex items-center justify-center border-none bg-transparent cursor-pointer shrink-0;
  height: 44px;
  width: 40px;
  color: oklch(var(--bc) / 0.55);
  transition: background-color 0.12s ease, color 0.12s ease;
  -webkit-app-region: no-drag;
}

.win-btn:hover {
  background-color: oklch(var(--bc) / 0.08);
  color: oklch(var(--bc) / 0.85);
}

.win-btn:active {
  background-color: oklch(var(--bc) / 0.12);
}

.win-btn:focus-visible {
  outline: 2px solid oklch(0.55 0.22 252);
  outline-offset: -2px;
}



.win-btn-close:hover {
  background-color: #e81123;
  color: #fff;
}

.win-btn-close:active {
  background-color: #bf0f1b;
  color: #fff;
}



.drag-bar {
  position: relative;
}

.drag-bar::before,
.drag-bar::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
}

.drag-bar::before {
  right: 100%;
}

.drag-bar::after {
  left: 100%;
}
</style>
