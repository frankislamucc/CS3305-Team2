function smoothingFactor(t_e, cutoff) {
  const r = 2 * Math.PI * cutoff * t_e
  return r / (r + 1)
}

function exponentialSmoothing(a, x, xPrev) {
  return a * x + (1 - a) * xPrev
}

// Helpers to support number OR array
function isArray(x) {
  return Array.isArray(x)
}

function absVal(x) {
  if (isArray(x)) return x.map(v => Math.abs(v))
  return Math.abs(x)
}

function add(a, b) {
  if (isArray(a)) return a.map((v, i) => v + b[i])
  return a + b
}

function sub(a, b) {
  if (isArray(a)) return a.map((v, i) => v - b[i])
  return a - b
}

function mul(a, b) {
  // scalar*scalar OR array*array OR array*scalar
  if (isArray(a) && isArray(b)) return a.map((v, i) => v * b[i])
  if (isArray(a)) return a.map(v => v * b)
  if (isArray(b)) return b.map(v => a * v)
  return a * b
}

function div(a, b) {
  if (isArray(a)) return a.map(v => v / b)
  return a / b
}

export class OneEuroFilter {
  constructor(t0, x0, dx0 = 0.0, minCutoff = 0.00001, beta = 20, dCutoff = 1.0) {
    // Store params (match python behavior: per-dimension arrays)
    if (isArray(x0)) {
      this.minCutoff = x0.map(() => minCutoff)
      this.beta = x0.map(() => beta)
      this.dCutoff = x0.map(() => dCutoff)

      this.xPrev = [...x0]
      this.dxPrev = x0.map(() => dx0)
    } else {
      this.minCutoff = minCutoff
      this.beta = beta
      this.dCutoff = dCutoff

      this.xPrev = x0
      this.dxPrev = dx0
    }

    this.tPrev = t0
  }

  filter(t, x) {
    const t_e = t - this.tPrev

    // Prevent divide-by-zero / weird timing spikes
    if (t_e <= 0) return this.xPrev

    // ----- Derivative filtering -----
    // a_d = smoothing_factor(t_e, d_cutoff)
    const a_d = isArray(this.dCutoff)
      ? this.dCutoff.map(dc => smoothingFactor(t_e, dc))
      : smoothingFactor(t_e, this.dCutoff)

    // dx = (x - x_prev) / t_e
    const dx = div(sub(x, this.xPrev), t_e)

    // dx_hat = exponential_smoothing(a_d, dx, dx_prev)
    const dxHat = isArray(dx)
      ? dx.map((v, i) => exponentialSmoothing(a_d[i], v, this.dxPrev[i]))
      : exponentialSmoothing(a_d, dx, this.dxPrev)

    // ----- Signal filtering -----
    // cutoff = min_cutoff + beta * abs(dx_hat)
    const cutoff = isArray(dxHat)
      ? dxHat.map((v, i) => this.minCutoff[i] + this.beta[i] * Math.abs(v))
      : this.minCutoff + this.beta * Math.abs(dxHat)

    // a = smoothing_factor(t_e, cutoff)
    const a = isArray(cutoff)
      ? cutoff.map(c => smoothingFactor(t_e, c))
      : smoothingFactor(t_e, cutoff)

    // x_hat = exponential_smoothing(a, x, x_prev)
    const xHat = isArray(x)
      ? x.map((v, i) => exponentialSmoothing(a[i], v, this.xPrev[i]))
      : exponentialSmoothing(a, x, this.xPrev)

    // Memorize previous values
    this.xPrev = isArray(xHat) ? [...xHat] : xHat
    this.dxPrev = isArray(dxHat) ? [...dxHat] : dxHat
    this.tPrev = t

    return xHat
  }
}