// One Euro Filter Implementation
export function smoothingFactor(time_elapsed, cutoff) {
  // Calculate smoothing factor based on time elapsed and cutoff frequency
  const rate = 2 * Math.PI * cutoff * time_elapsed
  return rate / (rate + 1)
}

export function exponentialSmoothing(a, newValue, prevValue) {
  // Apply exponential smoothing: blends new value with previous value
  // lower a is, more smoothing
  return a * newValue + (1 - a) * prevValue
}

function isArray(newValue) {
  return Array.isArray(newValue)
}

function sub(a, b) {
  if (isArray(a)) return a.map((value, index) => value - b[index])
  return a - b
}

function div(a, b) {
  if (isArray(a)) return a.map(value => value / b)
  return a / b
}

export class OneEuroFilter {
  constructor(initTime, initValue, initDeriv = 0.0, minCutoff = 1.0, beta = 0.05, dCutoff = 1.0) {
    // Initialize filter with starting values
    // initTime: initial timestamp (seconds)
    // initValue: initial value(s) - can be scalar or [x,y] array
    // initDeriv: initial derivative (velocity) - defaults to 0
    // minCutoff: minimum cutoff frequency (Hz) - controls base smoothing
    // beta: speed coefficient - higher = more responsive to fast movements
    // dCutoff: cutoff for derivative filtering - smooths velocity estimates

    if (isArray(initValue)) {
      // Array mode: track multiple dimensions (like x,y coordinates)
      this.minCutoff = initValue.map(() => minCutoff)
      this.beta = initValue.map(() => beta)
      this.dCutoff = initValue.map(() => dCutoff)

      this.prevValue = [...initValue] // Store previous filtered position
      this.dxPrev = initValue.map(() => initDeriv) // Store previous derivative
    } else {
      // Scalar mode: track single value
      this.minCutoff = minCutoff
      this.beta = beta
      this.dCutoff = dCutoff

      this.prevValue = initValue
      this.dxPrev = initDeriv
    }

    this.tPrev = initTime // Store previous timestamp
  }

  filter(time, newValue) {
    // Apply filter to new measurement
    // time: current timestamp (seconds)
    // newValue: new measurement value(s)
    // Returns: filtered value(s)

    const time_elapsed = time - this.tPrev // Time elapsed since last update
    if (time_elapsed <= 0) return this.prevValue

    const a_d = isArray(this.dCutoff)
      ? this.dCutoff.map(dc => smoothingFactor(time_elapsed, dc))
      : smoothingFactor(time_elapsed, this.dCutoff)

    // Calculate raw derivative: (new - old) / time
    const dx = div(sub(newValue, this.prevValue), time_elapsed)

    // Apply smoothing to derivative
    const dxHat = isArray(dx)
      ? dx.map((value, index) => exponentialSmoothing(a_d[index], value, this.dxPrev[index]))
      : exponentialSmoothing(a_d, dx, this.dxPrev)

    const cutoff = isArray(dxHat)
      ? dxHat.map((value, index) => this.minCutoff[index] + this.beta[index] * Math.abs(value))
      : this.minCutoff + this.beta * Math.abs(dxHat)

    const a = isArray(cutoff)
      ? cutoff.map(c => smoothingFactor(time_elapsed, c))
      : smoothingFactor(time_elapsed, cutoff)

    // Apply smoothing to position
    const xHat = isArray(newValue)
      ? newValue.map((value, index) => exponentialSmoothing(a[index], value, this.prevValue[index]))
      : exponentialSmoothing(a, newValue, this.prevValue)

    this.prevValue = isArray(xHat) ? [...xHat] : xHat
    this.dxPrev = isArray(dxHat) ? [...dxHat] : dxHat
    this.tPrev = time

    return xHat
  }
}

export class SimpleEMA {
  constructor(alpha = 0.3) {
    this.alpha = alpha
    this.value = null
  }

  filter(newValue) {
    if (this.value === null) {
      this.value = Array.isArray(newValue) ? [...newValue] : newValue
      return this.value
    }

    if (Array.isArray(newValue)) {
      this.value = this.value.map((value, index) =>
        this.alpha * newValue[index] + (1 - this.alpha) * value
      )
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value
    }

    return this.value
  }
}