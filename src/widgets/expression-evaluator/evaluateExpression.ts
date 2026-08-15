type TokenType = 'number' | 'operator' | 'lparen' | 'rparen' | 'end'

interface Token {
  type: TokenType
  value: string
}

const NUMBER_PATTERN = /^\d+(\.\d+)?$|^\.\d+$/

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const start = i
      while (i < input.length && /[0-9.]/.test(input[i])) i++
      const raw = input.slice(start, i)
      if (!NUMBER_PATTERN.test(raw)) throw new Error(`Invalid number "${raw}"`)
      tokens.push({ type: 'number', value: raw })
      continue
    }
    if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch })
      i++
      continue
    }
    throw new Error(`Unexpected character "${ch}"`)
  }
  tokens.push({ type: 'end', value: '' })
  return tokens
}

/** Recursive-descent parser over `+ - * / % ^ ( )`, evaluating as it goes
 * rather than building an AST — nothing downstream needs the tree, just
 * the final number. `^` is right-associative and binds tighter than unary
 * minus on its left (`-2^2` is `-4`) but the exponent itself may be
 * signed (`2^-2` is `0.25`). */
class Parser {
  private pos = 0
  private tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private consume(): Token {
    return this.tokens[this.pos++]
  }

  parseExpression(): number {
    return this.parseAddSub()
  }

  expectEnd(): void {
    const token = this.peek()
    if (token.type !== 'end') throw new Error(`Unexpected token "${token.value}"`)
  }

  private parseAddSub(): number {
    let value = this.parseMulDiv()
    while (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value
      const rhs = this.parseMulDiv()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }

  private parseMulDiv(): number {
    let value = this.parseUnary()
    while (
      this.peek().type === 'operator' &&
      (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')
    ) {
      const op = this.consume().value
      const rhs = this.parseUnary()
      if ((op === '/' || op === '%') && rhs === 0) throw new Error('Division by zero')
      value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs
    }
    return value
  }

  private parseUnary(): number {
    if (this.peek().type === 'operator' && (this.peek().value === '-' || this.peek().value === '+')) {
      const op = this.consume().value
      const value = this.parseUnary()
      return op === '-' ? -value : value
    }
    return this.parsePower()
  }

  private parsePower(): number {
    const base = this.parsePrimary()
    if (this.peek().type === 'operator' && this.peek().value === '^') {
      this.consume()
      const exponent = this.parseUnary()
      return Math.pow(base, exponent)
    }
    return base
  }

  private parsePrimary(): number {
    const token = this.peek()
    if (token.type === 'number') {
      this.consume()
      return Number(token.value)
    }
    if (token.type === 'lparen') {
      this.consume()
      const value = this.parseAddSub()
      if (this.peek().type !== 'rparen') throw new Error('Missing closing parenthesis')
      this.consume()
      return value
    }
    throw new Error(token.type === 'end' ? 'Unexpected end of expression' : `Unexpected token "${token.value}"`)
  }
}

export interface EvaluateResult {
  value: number | null
  error: string | null
}

/** Evaluates a basic arithmetic expression (`+ - * / % ^` and parentheses)
 * without `eval()`. Empty input isn't an error — it just has no result
 * yet — everything else that fails to parse or evaluate reports a
 * human-readable message instead of throwing. */
export function evaluateExpression(input: string): EvaluateResult {
  const trimmed = input.trim()
  if (!trimmed) return { value: null, error: null }
  try {
    const parser = new Parser(tokenize(trimmed))
    const value = parser.parseExpression()
    parser.expectEnd()
    if (!Number.isFinite(value)) throw new Error('Result is not a finite number')
    return { value, error: null }
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : 'Invalid expression' }
  }
}
