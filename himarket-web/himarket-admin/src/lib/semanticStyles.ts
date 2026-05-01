import type { CSSProperties } from 'react'

import { colors } from '../../../shared/design-tokens/colors'

export type SemanticTone = keyof typeof colors.semantic

export const semanticTagStyle = (tone: SemanticTone): CSSProperties => {
  const color = colors.semantic[tone]

  return {
    color,
    borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
  }
}

export const semanticIconStyle = (tone: SemanticTone, fontSize = 12): CSSProperties => ({
  color: colors.semantic[tone],
  fontSize,
})
