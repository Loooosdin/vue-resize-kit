import type { ResizeBox, ResizeSize } from './types'

type BoxSizeValue = ResizeObserverSize | readonly ResizeObserverSize[] | undefined

function firstBoxSize(value: BoxSizeValue): ResizeObserverSize | undefined {
  if (Array.isArray(value)) return value[0]
  return value as ResizeObserverSize | undefined
}

function isVerticalWritingMode(target: Element): boolean {
  try {
    const view = target.ownerDocument?.defaultView
    const writingMode = view?.getComputedStyle(target).writingMode ?? ''
    return writingMode.startsWith('vertical') || writingMode.startsWith('sideways')
  } catch {
    return false
  }
}

/**
 * 从原生 entry 提取指定 box 的尺寸。
 * 老浏览器缺少 boxSize 字段时回退到 contentRect，保证 API 仍可使用。
 */
export function extractResizeSize(entry: ResizeObserverEntry, box: ResizeBox): ResizeSize {
  const boxSize =
    box === 'border-box'
      ? firstBoxSize(entry.borderBoxSize)
      : box === 'device-pixel-content-box'
        ? firstBoxSize(entry.devicePixelContentBoxSize)
        : firstBoxSize(entry.contentBoxSize)

  if (!boxSize) {
    return {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
      inlineSize: entry.contentRect.width,
      blockSize: entry.contentRect.height,
    }
  }

  const inlineSize = boxSize.inlineSize
  const blockSize = boxSize.blockSize
  const vertical = isVerticalWritingMode(entry.target)

  return {
    width: vertical ? blockSize : inlineSize,
    height: vertical ? inlineSize : blockSize,
    inlineSize,
    blockSize,
  }
}
