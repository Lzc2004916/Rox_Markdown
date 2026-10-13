


import type { ThemeDefinition } from './types'
import { PAGE_WIDTH, PAGE_HEIGHT, CONTENT_LEFT, CONTENT_RIGHT } from './types'



function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  if (value.length !== 6) return `rgba(36,52,70,${alpha})`
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}




export function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'cornerBracket') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1
  const armLen = 28 * scale
  const inset = 8
  const lineWidth = 1.5 * scale

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'

  const corners = [
    
    { x: CONTENT_LEFT + inset, y: inset + 20, dx1: 1, dy1: 0, dx2: 0, dy2: 1 },
    
    { x: CONTENT_RIGHT - inset, y: inset + 20, dx1: -1, dy1: 0, dx2: 0, dy2: 1 },
    
    { x: CONTENT_LEFT + inset, y: PAGE_HEIGHT - inset - 20, dx1: 1, dy1: 0, dx2: 0, dy2: -1 },
    
    { x: CONTENT_RIGHT - inset, y: PAGE_HEIGHT - inset - 20, dx1: -1, dy1: 0, dx2: 0, dy2: -1 },
  ]

  for (const c of corners) {
    ctx.beginPath()
    ctx.moveTo(c.x, c.y)
    ctx.lineTo(c.x + armLen * c.dx1, c.y + armLen * c.dy1)
    ctx.moveTo(c.x, c.y)
    ctx.lineTo(c.x + armLen * c.dx2, c.y + armLen * c.dy2)
    ctx.stroke()
  }

  ctx.restore()
}




export function drawTopRule(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  titleEndY: number,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'topRule') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const y = titleEndY + 12

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'

  
  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT, y)
  ctx.lineTo(CONTENT_RIGHT, y)
  ctx.stroke()

  
  ctx.strokeStyle = hexToRgba(color, alpha * 0.5)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT + 40, y + 4)
  ctx.lineTo(CONTENT_RIGHT - 40, y + 4)
  ctx.stroke()

  ctx.restore()
}




export function drawGeometricPattern(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'geometricPattern') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1
  const spacing = 48 * scale

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.lineWidth = 0.6

  
  for (let x = -spacing; x < PAGE_WIDTH + spacing; x += spacing) {
    for (let y = -spacing; y < PAGE_HEIGHT + spacing; y += spacing) {
      const cx = x + (Math.floor(y / spacing) % 2) * (spacing / 2)
      ctx.beginPath()
      ctx.moveTo(cx, y - spacing / 3)
      ctx.lineTo(cx + spacing / 4, y)
      ctx.lineTo(cx, y + spacing / 3)
      ctx.lineTo(cx - spacing / 4, y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  ctx.restore()
}




export function drawCircuitTrace(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'circuitTrace') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = hexToRgba(color, alpha * 1.5)

  
  const traces = [
    
    [
      [PAGE_WIDTH - 10, 52], [PAGE_WIDTH - 42, 52],
      [PAGE_WIDTH - 42, 62], [PAGE_WIDTH - 32, 62],
      [PAGE_WIDTH - 32, 72],
    ],
    
    [
      [10, PAGE_HEIGHT - 52], [42, PAGE_HEIGHT - 52],
      [42, PAGE_HEIGHT - 62], [32, PAGE_HEIGHT - 62],
      [32, PAGE_HEIGHT - 72],
    ],
  ]

  for (const trace of traces) {
    ctx.beginPath()
    ctx.moveTo(trace[0]![0]!, trace[0]![1]!)
    for (let i = 1; i < trace.length; i++) {
      ctx.lineTo(trace[i]![0]!, trace[i]![1]!)
    }
    ctx.stroke()

    
    const end = trace[trace.length - 1]!
    ctx.beginPath()
    ctx.arc(end[0]!, end[1]!, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}




export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'watermark') return

  
  ctx.save()
  ctx.restore()
}




export function drawGoldFoil(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'goldFoil') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent

  ctx.save()

  
  const seed = 137
  for (let i = 0; i < 45; i++) {
    const px = ((seed * (i + 1) * 23 + i * 7) % (PAGE_WIDTH - 80)) + 40
    const py = ((seed * (i + 1) * 41 + i * 13) % (PAGE_HEIGHT - 120)) + 60
    const size = 0.6 + (i % 5) * 0.5
    const particleAlpha = alpha * (0.5 + (i % 3) * 0.25)

    ctx.fillStyle = hexToRgba(color, particleAlpha)
    ctx.beginPath()
    
    if (i % 4 === 0) {
      
      ctx.moveTo(px, py - size)
      ctx.lineTo(px + size * 0.7, py)
      ctx.lineTo(px, py + size)
      ctx.lineTo(px - size * 0.7, py)
    } else {
      
      ctx.arc(px, py, size, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  ctx.restore()
}




export function drawLeafMotif(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'leafMotif') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.fillStyle = hexToRgba(color, alpha * 0.35)
  ctx.lineWidth = 1.2 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  
  const leaves = [
    { x: 22, y: 180, angle: -0.3, size: 14 * scale },
    { x: 24, y: 340, angle: 0.2, size: 11 * scale },
    { x: 20, y: 500, angle: -0.15, size: 12 * scale },
  ]

  for (const leaf of leaves) {
    ctx.save()
    ctx.translate(leaf.x, leaf.y)
    ctx.rotate(leaf.angle)

    
    ctx.beginPath()
    ctx.moveTo(0, -leaf.size)
    ctx.bezierCurveTo(
      leaf.size * 0.6, -leaf.size * 0.5,
      leaf.size * 0.6, leaf.size * 0.3,
      0, leaf.size * 0.7,
    )
    ctx.bezierCurveTo(
      -leaf.size * 0.6, leaf.size * 0.3,
      -leaf.size * 0.6, -leaf.size * 0.5,
      0, -leaf.size,
    )
    ctx.fill()
    ctx.stroke()

    
    ctx.beginPath()
    ctx.moveTo(0, -leaf.size * 0.8)
    ctx.lineTo(0, leaf.size * 0.5)
    ctx.stroke()

    ctx.restore()
  }

  ctx.restore()
}




export function drawAuroraGlow(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || (decor.kind !== 'auroraGlow')) return

  const alpha = decor.opacity

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  
  const aurora1 = ctx.createLinearGradient(0, 0, PAGE_WIDTH, 0)
  aurora1.addColorStop(0, 'rgba(58, 200, 220, 0)')
  aurora1.addColorStop(0.3, `rgba(58, 200, 220, ${alpha * 0.6})`)
  aurora1.addColorStop(0.5, `rgba(120, 220, 180, ${alpha})`)
  aurora1.addColorStop(0.7, `rgba(180, 200, 240, ${alpha * 0.5})`)
  aurora1.addColorStop(1, 'rgba(200, 220, 255, 0)')
  ctx.fillStyle = aurora1
  ctx.fillRect(0, 80, PAGE_WIDTH, 40)

  
  const aurora2 = ctx.createLinearGradient(0, 0, PAGE_WIDTH, 0)
  aurora2.addColorStop(0, 'rgba(180, 200, 255, 0)')
  aurora2.addColorStop(0.4, `rgba(140, 180, 240, ${alpha * 0.4})`)
  aurora2.addColorStop(0.6, `rgba(100, 200, 220, ${alpha * 0.7})`)
  aurora2.addColorStop(1, 'rgba(80, 180, 210, 0)')
  ctx.fillStyle = aurora2
  ctx.fillRect(0, 100, PAGE_WIDTH, 28)

  ctx.restore()
}




export function drawFanBurst(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'fanBurst') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.strokeStyle = hexToRgba(color, alpha)
  ctx.lineCap = 'round'

  
  const originX = 0
  const originY = 0
  const maxRadius = 380 * scale
  const startAngle = -0.05   
  const endAngle = 0.58      

  drawFanRays(ctx, originX, originY, maxRadius, startAngle, endAngle, alpha, color, scale)

  
  const brX = PAGE_WIDTH
  const brY = PAGE_HEIGHT
  const brMaxRadius = 320 * scale
  const brStartAngle = Math.PI - 0.08  
  const brEndAngle = Math.PI - 0.52    

  drawFanRays(ctx, brX, brY, brMaxRadius, brStartAngle, brEndAngle, alpha * 0.65, color, scale * 0.85)

  ctx.restore()
}


function drawFanRays(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  maxRadius: number,
  startAngle: number,
  endAngle: number,
  alpha: number,
  color: string,
  scale: number,
): void {
  const rayCount = 28
  const angleStep = (endAngle - startAngle) / rayCount

  for (let i = 0; i < rayCount; i++) {
    const angle = startAngle + i * angleStep

    
    const lengthRatio = 0.45 + (i % 4) * 0.14 + (i / rayCount) * 0.08
    const rayLength = maxRadius * Math.min(1, lengthRatio)
    const lineWidth = 0.7 + (i % 3 === 0 ? 0.8 : 0) * scale

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = hexToRgba(color, alpha * (0.55 + (i % 3) * 0.22))

    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(
      ox + Math.cos(angle) * rayLength,
      oy + Math.sin(angle) * rayLength,
    )
    ctx.stroke()

    
    if (i % 5 === 0) {
      const dotAlpha = alpha * 0.7
      ctx.fillStyle = hexToRgba(color, dotAlpha)
      ctx.beginPath()
      ctx.arc(
        ox + Math.cos(angle) * rayLength * 0.94,
        oy + Math.sin(angle) * rayLength * 0.94,
        1.8 * scale,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }
}




export function drawMacosWindow(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'macosWindow') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  
  const topY = 26 * scale           
  const startX = CONTENT_LEFT + 2  
  const btnRadius = 6.5 * scale     
  const btnGap = 18 * scale         

  
  const buttons = [
    { color: '#ff5f57', label: 'close' },
    { color: '#febc2e', label: 'minimize' },
    { color: '#28c840', label: 'maximize' },
  ]

  ctx.save()

  
  for (let i = 0; i < buttons.length; i++) {
    const cx = startX + i * btnGap
    const cy = topY
    const btn = buttons[i]!

    
    ctx.fillStyle = btn.color
    ctx.globalAlpha = alpha * 0.92
    ctx.beginPath()
    ctx.arc(cx, cy, btnRadius, 0, Math.PI * 2)
    ctx.fill()

    
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.globalAlpha = alpha * 0.45
    ctx.beginPath()
    ctx.arc(cx - btnRadius * 0.25, cy - btnRadius * 0.3, btnRadius * 0.35, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
  }

  
  
  const arcStartX = startX + 2 * btnGap + btnRadius + 8 * scale
  const arcStartY = topY

  ctx.strokeStyle = hexToRgba(color, alpha * 0.55)
  ctx.lineWidth = 1.1 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(arcStartX, arcStartY)
  
  ctx.bezierCurveTo(
    arcStartX + 16 * scale, arcStartY - 10 * scale,   
    arcStartX + 44 * scale, arcStartY - 4 * scale,    
    arcStartX + 62 * scale, arcStartY + 2 * scale,     
  )
  ctx.stroke()

  
  ctx.strokeStyle = hexToRgba(color, alpha * 0.35)
  ctx.lineWidth = 0.7 * scale

  ctx.beginPath()
  ctx.moveTo(arcStartX + 4 * scale, arcStartY + 5 * scale)
  ctx.bezierCurveTo(
    arcStartX + 20 * scale, arcStartY - 3 * scale,
    arcStartX + 48 * scale, arcStartY + 1 * scale,
    arcStartX + 64 * scale, arcStartY + 6 * scale,
  )
  ctx.stroke()

  ctx.restore()
}




export function drawDesertSun(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'desertSun') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  
  const sunCx = PAGE_WIDTH * 0.72
  const sunCy = PAGE_HEIGHT - 148 * scale
  const sunR = 42 * scale

  
  const glowGrad = ctx.createRadialGradient(sunCx, sunCy, sunR * 0.5, sunCx, sunCy, sunR * 2.2)
  glowGrad.addColorStop(0, hexToRgba(color, 0.75))
  glowGrad.addColorStop(0.5, hexToRgba(color, 0.32))
  glowGrad.addColorStop(1, hexToRgba(color, 0))
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(sunCx, sunCy, sunR * 2.2, 0, Math.PI * 2)
  ctx.fill()

  
  ctx.fillStyle = hexToRgba(color, 0.88)
  ctx.beginPath()
  ctx.arc(sunCx, sunCy, sunR, 0, Math.PI * 2)
  ctx.fill()

  
  const horizonY = sunCy + 4 * scale
  ctx.strokeStyle = hexToRgba(color, 0.70)
  ctx.lineWidth = 2.0 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT - 10, horizonY + 14 * scale)
  
  ctx.lineTo(CONTENT_LEFT + 60 * scale, horizonY - 6 * scale)
  ctx.lineTo(CONTENT_LEFT + 140 * scale, horizonY + 8 * scale)
  ctx.lineTo(CONTENT_LEFT + 240 * scale, horizonY - 2 * scale)
  ctx.lineTo(CONTENT_LEFT + 340 * scale, horizonY + 10 * scale)
  ctx.lineTo(CONTENT_LEFT + 420 * scale, horizonY - 4 * scale)
  ctx.lineTo(CONTENT_RIGHT + 10, horizonY + 6 * scale)
  ctx.stroke()

  
  ctx.strokeStyle = hexToRgba(color, 0.40)
  ctx.lineWidth = 1.1 * scale
  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT - 10, horizonY + 32 * scale)
  ctx.lineTo(CONTENT_LEFT + 100 * scale, horizonY + 22 * scale)
  ctx.lineTo(CONTENT_LEFT + 200 * scale, horizonY + 28 * scale)
  ctx.lineTo(CONTENT_LEFT + 320 * scale, horizonY + 18 * scale)
  ctx.lineTo(CONTENT_LEFT + 460 * scale, horizonY + 26 * scale)
  ctx.lineTo(CONTENT_RIGHT + 10, horizonY + 20 * scale)
  ctx.stroke()

  
  ctx.strokeStyle = hexToRgba(color, 0.60)
  ctx.lineWidth = 1.5 * scale
  const birds = [
    { x: sunCx - 80 * scale, y: sunCy - 28 * scale, s: 1.0 },
    { x: sunCx - 55 * scale, y: sunCy - 36 * scale, s: 0.7 },
    { x: sunCx - 30 * scale, y: sunCy - 22 * scale, s: 0.85 },
  ]
  for (const b of birds) {
    const bs = 5 * scale * b.s
    ctx.beginPath()
    ctx.moveTo(b.x - bs, b.y - bs * 0.5)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(b.x + bs, b.y - bs * 0.5)
    ctx.stroke()
  }

  ctx.restore()
}




export function drawSakuraPetal(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'sakuraPetal') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  
  const seed = 271
  const petalCount = 14
  for (let i = 0; i < petalCount; i++) {
    const px = ((seed * (i + 1) * 37 + i * 19) % (PAGE_WIDTH - 120)) + 40
    const py = ((seed * (i + 1) * 53 + i * 31) % (PAGE_HEIGHT - 160)) + 40
    const petalSize = (3.5 + (i % 4) * 2.2) * scale
    const rotation = ((i * 47 + 13) % 360) * (Math.PI / 180)
    const petalAlpha = 0.60 + (i % 3) * 0.22

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rotation)

    
    ctx.fillStyle = hexToRgba(color, petalAlpha * 0.80)
    ctx.strokeStyle = hexToRgba(color, petalAlpha * 0.92)
    ctx.lineWidth = 0.7 * scale
    ctx.beginPath()

    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2 - Math.PI / 2
      const tipX = Math.cos(angle) * petalSize
      const tipY = Math.sin(angle) * petalSize

      
      const spreadAngle = 0.38
      const cp1x = Math.cos(angle - spreadAngle) * petalSize * 0.45
      const cp1y = Math.sin(angle - spreadAngle) * petalSize * 0.45
      const cp2x = Math.cos(angle + spreadAngle) * petalSize * 0.45
      const cp2y = Math.sin(angle + spreadAngle) * petalSize * 0.45

      if (p === 0) {
        ctx.moveTo(0, petalSize * 0.18)
      }
      ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY)
      ctx.quadraticCurveTo(cp2x, cp2y, 0, petalSize * 0.18)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    
    ctx.fillStyle = hexToRgba(color, petalAlpha * 0.95)
    ctx.beginPath()
    ctx.arc(0, 0, petalSize * 0.14, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  ctx.restore()
}




export function drawCoralBranch(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'coralBranch') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  type Branch = { x: number; y: number; angle: number; length: number; depth: number }
  const branches: Branch[] = []

  
  const origins: Branch[] = [
    
    { x: CONTENT_LEFT + 10, y: PAGE_HEIGHT - 30, angle: -0.8, length: 80 * scale, depth: 0 },
    { x: CONTENT_LEFT + 10, y: PAGE_HEIGHT - 30, angle: -0.35, length: 55 * scale, depth: 0 },
    
    { x: CONTENT_RIGHT - 10, y: 30, angle: Math.PI + 0.8, length: 70 * scale, depth: 0 },
    { x: CONTENT_RIGHT - 10, y: 30, angle: Math.PI + 0.35, length: 48 * scale, depth: 0 },
  ]

  
  function pseudoRand(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
  }

  function growBranchDeterministic(b: Branch, maxDepth: number, seedBase: number): void {
    if (b.depth >= maxDepth) return
    branches.push(b)

    const childCount = b.depth === 0 ? 3 : 2
    for (let i = 0; i < childCount; i++) {
      const spread = 0.4
      const childAngle = b.angle + (i - (childCount - 1) / 2) * spread
      const r = pseudoRand(seedBase + b.depth * 100 + i)
      const childLength = b.length * (0.5 + r * 0.25)
      const t = 0.35 + (i / childCount) * 0.55
      growBranchDeterministic(
        {
          x: b.x + Math.cos(b.angle) * b.length * t,
          y: b.y + Math.sin(b.angle) * b.length * t,
          angle: childAngle,
          length: childLength,
          depth: b.depth + 1,
        },
        maxDepth,
        seedBase + i * 13,
      )
    }
  }

  for (const origin of origins) {
    growBranchDeterministic(origin, 3, Math.round(origin.x * 100 + origin.y))
  }

  
  for (const b of branches) {
    const endX = b.x + Math.cos(b.angle) * b.length
    const endY = b.y + Math.sin(b.angle) * b.length

    ctx.strokeStyle = hexToRgba(color, 0.60 + b.depth * 0.10)
    ctx.lineWidth = (2.4 - b.depth * 0.35) * scale
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)

    
    const midX = (b.x + endX) / 2 + Math.cos(b.angle + 0.3) * b.length * 0.15
    const midY = (b.y + endY) / 2 + Math.sin(b.angle + 0.3) * b.length * 0.15
    ctx.quadraticCurveTo(midX, midY, endX, endY)
    ctx.stroke()

    
    ctx.fillStyle = hexToRgba(color, 0.78 + b.depth * 0.10)
    ctx.beginPath()
    ctx.arc(endX, endY, (2.5 - b.depth * 0.3) * scale, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}




export function drawCrystalFacet(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'crystalFacet') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  
  drawCrystalCluster(ctx, 8, 8, -0.25, 1.0, color, scale)
  
  drawCrystalCluster(ctx, PAGE_WIDTH - 8, PAGE_HEIGHT - 8, Math.PI - 0.25, 0.85, color, scale)

  ctx.restore()
}


function drawCrystalCluster(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  baseAngle: number,
  clusterAlpha: number,
  color: string,
  scale: number,
): void {
  const facets: { angle: number; length: number; width: number; a: number }[] = [
    { angle: baseAngle,           length: 64 * scale, width: 14 * scale, a: 0.55 },
    { angle: baseAngle + 0.22,    length: 48 * scale, width: 10 * scale, a: 0.42 },
    { angle: baseAngle - 0.18,    length: 55 * scale, width: 12 * scale, a: 0.48 },
    { angle: baseAngle + 0.5,     length: 38 * scale, width: 8 * scale,  a: 0.35 },
    { angle: baseAngle - 0.45,    length: 42 * scale, width: 9 * scale,  a: 0.38 },
    { angle: baseAngle + 0.15,    length: 72 * scale, width: 4 * scale,  a: 0.30 },
  ]

  for (const f of facets) {
    const tipX = ox + Math.cos(f.angle) * f.length
    const tipY = oy + Math.sin(f.angle) * f.length
    const perpAngle = f.angle + Math.PI / 2

    
    const bx1 = ox + Math.cos(perpAngle) * f.width
    const by1 = oy + Math.sin(perpAngle) * f.width
    const bx2 = ox - Math.cos(perpAngle) * f.width
    const by2 = oy - Math.sin(perpAngle) * f.width

    
    ctx.fillStyle = hexToRgba(color, f.a * clusterAlpha)
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(bx1, by1)
    ctx.lineTo(bx2, by2)
    ctx.closePath()
    ctx.fill()

    
    ctx.strokeStyle = hexToRgba(color, (f.a + 0.30) * clusterAlpha)
    ctx.lineWidth = 0.9 * scale
    ctx.stroke()

    
    const hlX = ox + Math.cos(f.angle) * f.length * 0.55
    const hlY = oy + Math.sin(f.angle) * f.length * 0.55
    const hlPerp = Math.cos(perpAngle) * f.width * 0.3
    ctx.strokeStyle = hexToRgba('#ffffff', f.a * clusterAlpha * 0.32)
    ctx.lineWidth = 0.7 * scale
    ctx.beginPath()
    ctx.moveTo(hlX - hlPerp, hlY - Math.sin(perpAngle) * f.width * 0.3)
    ctx.lineTo(hlX + hlPerp, hlY + Math.sin(perpAngle) * f.width * 0.3)
    ctx.stroke()
  }
}




export function drawSketchHatch(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'sketchHatch') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = hexToRgba(color, 0.78)
  ctx.lineCap = 'round'

  
  drawHatchGroup(ctx, PAGE_WIDTH - 120 * scale, 18 * scale, -0.7, 20, 48 * scale, 58 * scale, color, scale)

  
  drawHatchGroup(ctx, CONTENT_LEFT + 10 * scale, PAGE_HEIGHT - 80 * scale, 0.55, 16, 42 * scale, 54 * scale, color, scale)

  ctx.restore()
}


function drawHatchGroup(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  angle: number,
  lineCount: number,
  maxLen: number,
  areaH: number,
  color: string,
  scale: number,
): void {
  
  for (let i = 0; i < lineCount; i++) {
    const t = i / (lineCount - 1)
    const sx = ox + Math.cos(angle + Math.PI / 2) * areaH * t
    const sy = oy + Math.sin(angle + Math.PI / 2) * areaH * t
    const len = maxLen * (0.5 + 0.5 * (1 - Math.abs(t - 0.5) * 2)) 

    ctx.lineWidth = (0.85 + (i % 3 === 0 ? 0.5 : 0)) * scale
    ctx.strokeStyle = hexToRgba(color, 0.55 + (i % 4) * 0.07)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
    ctx.stroke()
  }

  
  const angle2 = angle + 0.9
  for (let i = 0; i < lineCount * 0.6; i++) {
    const t = i / (lineCount * 0.6 - 1)
    const sx = ox + Math.cos(angle + Math.PI / 2) * areaH * (t + 0.1)
    const sy = oy + Math.sin(angle + Math.PI / 2) * areaH * (t + 0.1)
    const len = maxLen * 0.55 * (0.6 + 0.4 * (1 - Math.abs(t - 0.5) * 2))

    ctx.lineWidth = 0.55 * scale
    ctx.strokeStyle = hexToRgba(color, 0.35 + (i % 5) * 0.05)
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle2) * len, sy + Math.sin(angle2) * len)
    ctx.stroke()
  }
}




export function drawMatchaRing(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'matchaRing') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  
  const cx = PAGE_WIDTH - 100 * scale
  const cy = PAGE_HEIGHT - 90 * scale
  const ringCount = 6

  for (let i = 0; i < ringCount; i++) {
    const radius = (18 + i * 12) * scale
    const ringAlpha = 0.64 - i * 0.05

    
    ctx.strokeStyle = hexToRgba(color, ringAlpha)
    ctx.lineWidth = (1.0 + (i === 0 ? 0.5 : 0)) * scale
    ctx.beginPath()
    
    ctx.ellipse(cx, cy, radius, radius * 0.85, 0.15, 0.2, Math.PI * 1.75)
    ctx.stroke()

    
    if (i % 2 === 0) {
      ctx.strokeStyle = hexToRgba(color, ringAlpha * 0.72)
      ctx.lineWidth = 0.60 * scale
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius * 0.92, radius * 0.78, -0.1, Math.PI * 0.5, Math.PI * 2.1)
      ctx.stroke()
    }
  }

  
  const seed = 419
  const dotCount = 22
  for (let i = 0; i < dotCount; i++) {
    const dx = ((seed * (i + 1) * 31 + i * 17) % 160 - 40) * scale
    const dy = ((seed * (i + 1) * 43 + i * 23) % 140 - 30) * scale
    const dotSize = 0.7 + (i % 4) * 0.42 * scale

    const dotAlpha = 0.36 + (i % 6) * 0.08
    ctx.fillStyle = hexToRgba(color, dotAlpha)
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, dotSize, 0, Math.PI * 2)
    ctx.fill()
  }

  
  const cx2 = CONTENT_LEFT + 55 * scale
  const cy2 = 48 * scale
  for (let i = 0; i < 3; i++) {
    const radius = (12 + i * 10) * scale
    ctx.strokeStyle = hexToRgba(color, 0.32 - i * 0.04)
    ctx.lineWidth = 0.7 * scale
    ctx.beginPath()
    ctx.ellipse(cx2, cy2, radius, radius * 0.82, -0.25, 0.3, Math.PI * 1.6)
    ctx.stroke()
  }

  ctx.restore()
}




export function drawSealStamp(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'sealStamp') return

  const alpha = decor.opacity
  const color = decor.color ?? theme.palette.accent
  const scale = decor.scale ?? 1

  ctx.save()
  ctx.globalAlpha = alpha

  
  const stampSize = 58 * scale
  const cx = PAGE_WIDTH - 74 * scale      
  const cy = PAGE_HEIGHT - 74 * scale
  const half = stampSize / 2
  const cornerRadius = 3 * scale           
  const borderWidth = 2.2 * scale

  
  ctx.strokeStyle = color  
  ctx.lineWidth = borderWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  
  const x0 = cx - half, y0 = cy - half
  const x1 = cx + half, y1 = cy + half
  const r = cornerRadius
  ctx.moveTo(x0 + r, y0)
  ctx.lineTo(x1 - r, y0)
  ctx.arcTo(x1, y0, x1, y0 + r, r)
  ctx.lineTo(x1, y1 - r)
  ctx.arcTo(x1, y1, x1 - r, y1, r)
  ctx.lineTo(x0 + r, y1)
  ctx.arcTo(x0, y1, x0, y1 - r, r)
  ctx.lineTo(x0, y0 + r)
  ctx.arcTo(x0, y0, x0 + r, y0, r)
  ctx.closePath()
  ctx.stroke()

  
  const fillAlpha = 0.18
  ctx.fillStyle = hexToRgba(color, fillAlpha)
  ctx.fill()

  
  const seed = 619
  for (let i = 0; i < 16; i++) {
    const px = x0 + 6 * scale + ((seed * (i + 1) * 31 + i * 17) % (stampSize - 12 * scale))
    const py = y0 + 6 * scale + ((seed * (i + 1) * 47 + i * 23) % (stampSize - 12 * scale))
    const spotSize = (1.2 + (i % 4) * 0.8) * scale
    const spotAlpha = 0.04 + (i % 6) * 0.03
    ctx.fillStyle = hexToRgba(color, spotAlpha)
    ctx.beginPath()
    ctx.arc(px, py, spotSize, 0, Math.PI * 2)
    ctx.fill()
  }

  
  const chars = ['翰', '墨', '书', '香']
  
  const charSize = stampSize * 0.28
  const cellOffset = stampSize * 0.27      

  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${charSize}px "SimSun","STSong","Noto Serif SC","KaiTi",serif`

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const charX = cx + (col - 0.5) * cellOffset * 2
      const charY = cy + (row - 0.5) * cellOffset * 2
      ctx.fillText(chars[row * 2 + col]!, charX, charY)
    }
  }

  
  ctx.strokeStyle = hexToRgba(color, 0.06)
  ctx.lineWidth = 6 * scale
  ctx.beginPath()
  ctx.moveTo(x0 + r, y0)
  ctx.lineTo(x1 - r, y0)
  ctx.arcTo(x1, y0, x1, y0 + r, r)
  ctx.lineTo(x1, y1 - r)
  ctx.arcTo(x1, y1, x1 - r, y1, r)
  ctx.lineTo(x0 + r, y1)
  ctx.arcTo(x0, y1, x0, y1 - r, r)
  ctx.lineTo(x0, y0 + r)
  ctx.arcTo(x0, y0, x0 + r, y0, r)
  ctx.closePath()
  ctx.stroke()

  ctx.restore()
}




export function drawIosNotesNav(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const decor = theme.decor
  if (!decor || decor.kind !== 'iosNotesNav') return

  const alpha = decor.opacity
  const scale = decor.scale ?? 1

  const navY = 60 * scale                          

  ctx.save()
  ctx.globalAlpha = alpha

  
  const mutedColor = theme.palette.muted
  const textColor = theme.palette.text

  
  
  

  const leftX = CONTENT_LEFT + 2 * scale

  
  ctx.strokeStyle = mutedColor
  ctx.lineWidth = 2.5 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const arrowSize = 12 * scale
  ctx.moveTo(leftX + arrowSize, navY - arrowSize)
  ctx.lineTo(leftX, navY)
  ctx.lineTo(leftX + arrowSize, navY + arrowSize)
  ctx.stroke()

  
  const titleX = leftX + arrowSize + 12 * scale
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${26 * scale}px "PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif`
  ctx.fillText('备忘录', titleX, navY)

  
  
  

  const rightBase = CONTENT_RIGHT - 4 * scale
  const iconGap = 38 * scale

  
  const shareX = rightBase - iconGap
  ctx.strokeStyle = mutedColor
  ctx.lineWidth = 2.2 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  
  const boxSize = 11 * scale
  const boxTop = navY - boxSize
  ctx.strokeRect(shareX - boxSize * 0.6, boxTop, boxSize * 1.2, boxSize * 1.2)

  
  const arrowBaseY = boxTop
  ctx.beginPath()
  ctx.moveTo(shareX, arrowBaseY)
  ctx.lineTo(shareX, arrowBaseY - 7 * scale)
  ctx.stroke()

  
  ctx.beginPath()
  ctx.moveTo(shareX - 4 * scale, arrowBaseY - 4 * scale)
  ctx.lineTo(shareX, arrowBaseY - 8 * scale)
  ctx.lineTo(shareX + 4 * scale, arrowBaseY - 4 * scale)
  ctx.stroke()

  
  const moreX = rightBase
  const dotRadius = 2.2 * scale
  const dotGap = 5.5 * scale
  ctx.fillStyle = mutedColor

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.arc(moreX + i * dotGap, navY, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  
  
  
  const separatorY = navY + 26 * scale
  ctx.strokeStyle = hexToRgba(mutedColor, 0.18)
  ctx.lineWidth = 1.0 * scale
  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT, separatorY)
  ctx.lineTo(CONTENT_RIGHT, separatorY)
  ctx.stroke()

  ctx.restore()
}




export function drawDecor(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  titleEndY?: number,
): void {
  const decor = theme.decor
  if (!decor || decor.kind === 'none') return

  switch (decor.kind) {
    case 'cornerBracket':
      drawCornerBrackets(ctx, theme)
      break
    case 'topRule':
      drawTopRule(ctx, theme, titleEndY ?? 200)
      break
    case 'geometricPattern':
      drawGeometricPattern(ctx, theme)
      break
    case 'circuitTrace':
      drawCircuitTrace(ctx, theme)
      break
    case 'watermark':
      drawWatermark(ctx, theme)
      break
    case 'goldFoil':
      drawGoldFoil(ctx, theme)
      break
    case 'leafMotif':
      drawLeafMotif(ctx, theme)
      break
    case 'auroraGlow':
      drawAuroraGlow(ctx, theme)
      break
    case 'fanBurst':
      drawFanBurst(ctx, theme)
      break
    case 'macosWindow':
      drawMacosWindow(ctx, theme)
      break
    case 'desertSun':
      drawDesertSun(ctx, theme)
      break
    case 'sakuraPetal':
      drawSakuraPetal(ctx, theme)
      break
    case 'coralBranch':
      drawCoralBranch(ctx, theme)
      break
    case 'crystalFacet':
      drawCrystalFacet(ctx, theme)
      break
    case 'sketchHatch':
      drawSketchHatch(ctx, theme)
      break
    case 'matchaRing':
      drawMatchaRing(ctx, theme)
      break
    case 'sealStamp':
      drawSealStamp(ctx, theme)
      break
    case 'iosNotesNav':
      drawIosNotesNav(ctx, theme)
      break
  }
}