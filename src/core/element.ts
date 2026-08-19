/**
 * 判断未知值是否为 DOM Element。
 * 优先使用元素所属文档的构造器，避免 iframe 等跨 realm 场景下的误判。
 */
export function isElement(value: unknown): value is Element {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as {
    nodeType?: unknown
    ownerDocument?: { defaultView?: { Element?: typeof Element } | null } | null
  }
  if (candidate.nodeType !== 1) return false

  const ElementCtor = candidate.ownerDocument?.defaultView?.Element
  return typeof ElementCtor !== 'function' || value instanceof ElementCtor
}
