import { describe, expect, it } from 'vitest'
import { buildCsv } from './csv'

describe('buildCsv', () => {
  it('joins rows with CRLF', () => {
    expect(buildCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })
  it('quotes cells containing commas, quotes and newlines', () => {
    expect(buildCsv([['a,b', 'say "hi"', 'x\ny']])).toBe('"a,b","say ""hi""","x\ny"')
  })
  it('leaves plain cells unquoted', () => {
    expect(buildCsv([['plain']])).toBe('plain')
  })
})
