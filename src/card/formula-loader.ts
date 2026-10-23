/**
 * LaTeX → SVG assets for Canvas rendering.
 * MathJax emits standalone SVG, which works in Electron, browsers and iOS
 * without relying on DOM-only formula layout at export time.
 */
export interface FormulaRequest {
  latex: string
  display: boolean
}

export interface FormulaAsset {
  image: HTMLImageElement
  aspectRatio: number
}

const assets = new Map<string, FormulaAsset>()
const pending = new Map<string, Promise<void>>()
const assetColors = new Map<string, string>()
const requestedColors = new Map<string, string>()

function keyOf({ latex, display }: FormulaRequest): string {
  return `${display ? 'display' : 'inline'}:${latex}`
}

export function extractFormulaRequests(source: string): FormulaRequest[] {
  const found: FormulaRequest[] = []
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    const latex = (match[1] ?? match[2] ?? '').trim()
    if (latex) found.push({ latex, display: match[1] !== undefined })
  }
  return found
}

export function getFormulaAsset(latex: string, display: boolean): FormulaAsset | undefined {
  return assets.get(keyOf({ latex, display }))
}

export async function preloadFormulas(source: string, color: string): Promise<void> {
  const unique = new Map<string, FormulaRequest>()
  for (const request of extractFormulaRequests(source)) unique.set(keyOf(request), request)
  await Promise.all([...unique.values()].map((request) => loadFormula(request, color)))
}

async function loadFormula(request: FormulaRequest, color: string): Promise<void> {
  const key = keyOf(request)
  if (assets.has(key) && assetColors.get(key) === color) return
  requestedColors.set(key, color)
  if (assets.has(key)) assets.delete(key)
  // A color change can occur while MathJax is still loading. Keep requests
  // color-specific so the newest request is not silently satisfied by an old SVG.
  const pendingKey = `${key}\u0000${color}`
  const inFlight = pending.get(pendingKey)
  if (inFlight) return inFlight

  const task = renderFormula(request, color)
    .then((asset) => {
      if (requestedColors.get(key) === color) {
        assets.set(key, asset)
        assetColors.set(key, color)
      }
    })
    .catch((error) => { console.warn('[formula] LaTeX render failed:', request.latex, error) })
    .finally(() => { pending.delete(pendingKey) })
  pending.set(pendingKey, task)
  return task
}

async function renderFormula(request: FormulaRequest, color: string): Promise<FormulaAsset> {
  const [mathjaxModule, texModule, svgModule, adaptorModule, handlerModule, packagesModule] = await Promise.all([
    import('mathjax-full/js/mathjax.js'),
    import('mathjax-full/js/input/tex.js'),
    import('mathjax-full/js/output/svg.js'),
    import('mathjax-full/js/adaptors/liteAdaptor.js'),
    import('mathjax-full/js/handlers/html.js'),
    import('mathjax-full/js/input/tex/AllPackages.js'),
  ])
  const adaptor = adaptorModule.liteAdaptor()
  handlerModule.RegisterHTMLHandler(adaptor)
  const tex = new texModule.TeX({ packages: packagesModule.AllPackages })
  const svg = new svgModule.SVG({ fontCache: 'none' })
  const document = mathjaxModule.mathjax.document('', { InputJax: tex, OutputJax: svg })
  const output = adaptor.outerHTML(document.convert(request.latex, { display: request.display }))
  const rawSvg = output.match(/<svg[\s\S]*<\/svg>/)?.[0]
  if (!rawSvg) throw new Error('MathJax did not return SVG')

  const viewBox = rawSvg.match(/viewBox="[^" ]+\s+[^" ]+\s+([^" ]+)\s+([^" ]+)"/i)
  const width = Number(viewBox?.[1])
  const height = Number(viewBox?.[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    throw new Error('Formula SVG has an invalid viewBox')
  }
  const svgWithColor = rawSvg.replace('<svg', `<svg color="${color}"`)
  const blob = new Blob([svgWithColor], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Formula SVG decode failed'))
      img.src = url
    })
    return { image, aspectRatio: width / height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
