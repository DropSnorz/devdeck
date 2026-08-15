import { describe, expect, it } from 'vitest'
import { evaluateExpression } from './evaluateExpression'

describe('evaluateExpression', () => {
  it('returns a null value and no error for empty input', () => {
    expect(evaluateExpression('')).toEqual({ value: null, error: null })
    expect(evaluateExpression('   ')).toEqual({ value: null, error: null })
  })

  it('evaluates basic arithmetic', () => {
    expect(evaluateExpression('2 + 3').value).toBe(5)
    expect(evaluateExpression('10 - 4').value).toBe(6)
    expect(evaluateExpression('6 * 7').value).toBe(42)
    expect(evaluateExpression('9 / 2').value).toBe(4.5)
    expect(evaluateExpression('9 % 4').value).toBe(1)
  })

  it('respects operator precedence', () => {
    expect(evaluateExpression('2 + 3 * 4').value).toBe(14)
    expect(evaluateExpression('(2 + 3) * 4').value).toBe(20)
  })

  it('handles exponentiation as right-associative and higher precedence than unary minus', () => {
    expect(evaluateExpression('2 ^ 3 ^ 2').value).toBe(512) // 2^(3^2), not (2^3)^2
    expect(evaluateExpression('-2 ^ 2').value).toBe(-4) // -(2^2)
    expect(evaluateExpression('2 ^ -2').value).toBe(0.25)
  })

  it('handles unary plus and minus, including nested parentheses', () => {
    expect(evaluateExpression('-(3 + 4)').value).toBe(-7)
    expect(evaluateExpression('-(-5)').value).toBe(5)
    expect(evaluateExpression('+5').value).toBe(5)
  })

  it('handles decimal numbers', () => {
    expect(evaluateExpression('1.5 + 2.25').value).toBe(3.75)
    expect(evaluateExpression('.5 + .5').value).toBe(1)
  })

  it('reports division and modulo by zero as errors instead of Infinity/NaN', () => {
    expect(evaluateExpression('1 / 0').error).toMatch(/division by zero/i)
    expect(evaluateExpression('1 % 0').error).toMatch(/division by zero/i)
  })

  it('reports a missing closing parenthesis', () => {
    expect(evaluateExpression('(2 + 3').error).toMatch(/closing parenthesis/i)
  })

  it('reports an unexpected trailing token', () => {
    expect(evaluateExpression('2 + 3 4').error).toBeTruthy()
  })

  it('reports an invalid character', () => {
    expect(evaluateExpression('2 + a').error).toMatch(/unexpected character/i)
  })

  it('reports an empty parenthesized group', () => {
    expect(evaluateExpression('()').error).toBeTruthy()
  })
})
