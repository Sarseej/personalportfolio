/**
 * Hand-written TransformerLens inference — textbook forward pass.
 *
 * No ML libraries, no ONNX — plain typed arrays and matrix math.
 * Implements the standard pre-norm transformer:
 *
 *   x = W_E[token] + W_pos[position]
 *   for each layer:
 *     x_norm = LayerNorm(x)
 *     attn_out = MultiHeadCausalSelfAttention(x_norm)
 *     x = x + attn_out
 *   logits = W_U @ LayerNorm(x)
 *
 * Weights are exported from Python with standard (un-folded) LayerNorm.
 * All computation in Float64 to match JS Number precision.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ModelConfig {
  d_model: number;
  n_heads: number;
  n_layers: number;
  d_head: number;
  d_vocab: number;
  n_ctx: number;
}

export interface LayerWeights {
  ln1_w: Float64Array; // [d_model]
  ln1_b: Float64Array; // [d_model]
  W_Q: Float64Array; // [n_heads, d_model, d_head] flattened row-major
  b_Q: Float64Array; // [n_heads, d_head]
  W_K: Float64Array; // [n_heads, d_model, d_head]
  b_K: Float64Array; // [n_heads, d_head]
  W_V: Float64Array; // [n_heads, d_model, d_head]
  b_V: Float64Array; // [n_heads, d_head]
  W_O: Float64Array; // [n_heads, d_head, d_model]
  b_O: Float64Array; // [d_model]
}

export interface ModelWeights {
  config: ModelConfig;
  W_E: Float64Array; // [d_vocab, d_model] flattened row-major
  W_pos: Float64Array; // [n_ctx, d_model] flattened row-major
  W_U: Float64Array; // [d_model, d_vocab] flattened row-major
  layers: LayerWeights[];
  ln_final_w: Float64Array; // [d_model]
  ln_final_b: Float64Array; // [d_model]
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Flatten a nested JS number array into a Float64Array. */
function flatten(arr: unknown): Float64Array {
  const out: number[] = [];
  function go(a: unknown): void {
    if (Array.isArray(a)) {
      for (const x of a) go(x);
    } else {
      out.push(a as number);
    }
  }
  go(arr);
  return Float64Array.from(out);
}

// ── Weight loading ─────────────────────────────────────────────────────────

export interface RawWeights {
  config: ModelConfig;
  W_E: number[][];
  W_pos: number[][];
  W_U: number[][];
  layers: {
    ln1_w: number[];
    ln1_b: number[];
    W_Q: number[][][];
    b_Q: number[][];
    W_K: number[][][];
    b_K: number[][];
    W_V: number[][][];
    b_V: number[][];
    W_O: number[][][];
    b_O: number[];
  }[];
  ln_final_w: number[];
  ln_final_b: number[];
}

/** Convert raw JSON weights to flat typed arrays for fast access. */
export function loadWeights(raw: RawWeights): ModelWeights {
  const { config } = raw;
  return {
    config,
    W_E: flatten(raw.W_E),
    W_pos: flatten(raw.W_pos),
    W_U: flatten(raw.W_U),
    layers: raw.layers.map((l) => ({
      ln1_w: Float64Array.from(l.ln1_w),
      ln1_b: Float64Array.from(l.ln1_b),
      W_Q: flatten(l.W_Q),
      b_Q: flatten(l.b_Q),
      W_K: flatten(l.W_K),
      b_K: flatten(l.b_K),
      W_V: flatten(l.W_V),
      b_V: flatten(l.b_V),
      W_O: flatten(l.W_O),
      b_O: Float64Array.from(l.b_O),
    })),
    ln_final_w: Float64Array.from(raw.ln_final_w),
    ln_final_b: Float64Array.from(raw.ln_final_b),
  };
}

// ── Core math ──────────────────────────────────────────────────────────────

const LN_EPS = 1e-5;

/**
 * LayerNorm: standard pre-norm.
 *
 *   mean = (1/d) * Σ x_i
 *   var  = (1/d) * Σ (x_i - mean)^2
 *   y_i  = ((x_i - mean) / sqrt(var + eps)) * w_i + b_i
 *
 * Reference: Ba, Kiros & Hinton (2016), "Layer Normalization"
 */
function layerNorm(
  x: Float64Array, // [d_model] input
  w: Float64Array, // [d_model] gain
  b: Float64Array, // [d_model] bias
  out: Float64Array, // [d_model] output (written in-place)
  d: number, // d_model
): void {
  let mean = 0;
  for (let i = 0; i < d; i++) mean += x[i];
  mean /= d;

  let var_ = 0;
  for (let i = 0; i < d; i++) {
    const diff = x[i] - mean;
    var_ += diff * diff;
  }
  var_ /= d;

  const scale = 1 / Math.sqrt(var_ + LN_EPS);
  for (let i = 0; i < d; i++) {
    out[i] = (x[i] - mean) * scale * w[i] + b[i];
  }
}

/**
 * Full-sequence forward pass.
 *
 * Architecture (pre-norm transformer, attention-only, no MLP):
 *
 *   residual[t][:] = W_E[tokens[t]] + W_pos[t]
 *
 *   for each layer l:
 *     for each position t:
 *       ln[t] = LayerNorm(residual[t])
 *       for each head h:
 *         Q[t,h] = ln[t] @ W_Q[h] + b_Q[h]          (project to d_head)
 *         K[s,h] = ln[s] @ W_K[h] + b_K[h]  ∀ s<=t
 *         V[s,h] = ln[s] @ W_V[h] + b_V[h]  ∀ s<=t
 *         score[t,s] = softmax(Q[t]·K[s] / √d_head)  (causal: s<=t)
 *         head_out[t,h] = Σ_s score[t,s] * V[s,h]
 *       residual[t] += concat(head_out[t,:]) @ W_O^T + b_O
 *
 *   logits[t] = W_U @ LayerNorm(residual[t])
 *
 * Output: Float64Array of length T * d_vocab (row-major [T, d_vocab]).
 */
export function forward(
  weights: ModelWeights,
  tokens: number[], // token IDs, length T
): Float64Array {
  const { config, W_E, W_pos, W_U, layers, ln_final_w, ln_final_b } = weights;
  const { d_model, n_heads, d_head, d_vocab } = config;
  const T = tokens.length;

  // ── 1. Token + positional embedding ──
  // residual[t][i] = W_E[tokens[t]][i] + W_pos[t][i]
  const residual = new Float64Array(T * d_model);
  for (let t = 0; t < T; t++) {
    const tok = tokens[t];
    const rOff = t * d_model;
    const eOff = tok * d_model;
    const pOff = t * d_model;
    for (let i = 0; i < d_model; i++) {
      residual[rOff + i] = W_E[eOff + i] + W_pos[pOff + i];
    }
  }

  // ── Per-layer transformer blocks ──
  // Pre-compute LayerNorm outputs for all positions (reused by Q/K/V).
  const lnBuf = new Float64Array(T * d_model);
  // Per-head Q, K, V for all positions.
  // Q[t,h,:] = ln[t] @ W_Q[h] + b_Q[h]
  // K[t,h,:] = ln[t] @ W_K[h] + b_K[h]
  // V[t,h,:] = ln[t] @ W_V[h] + b_V[h]
  // Shape: [T, n_heads, d_head] = T * n_heads * d_head elements.
  const qAll = new Float64Array(T * n_heads * d_head);
  const kAll = new Float64Array(T * n_heads * d_head);
  const vAll = new Float64Array(T * n_heads * d_head);

  for (let layer = 0; layer < layers.length; layer++) {
    const lw = layers[layer];

    // LayerNorm for all positions
    for (let t = 0; t < T; t++) {
      const rOff = t * d_model;
      const lOff = t * d_model;
      layerNorm(
        residual.subarray(rOff, rOff + d_model),
        lw.ln1_w,
        lw.ln1_b,
        lnBuf.subarray(lOff, lOff + d_model),
        d_model,
      );
    }

    // Q = ln @ W_Q + b_Q, K = ln @ W_K + b_K, V = ln @ W_V + b_V
    // W_Q[h] is [d_model, d_head], stored at offset h * d_model * d_head
    // Column j of W_Q[h] (for output dim j) is at offset h*d_model*d_head + j
    // Element [i][j] is at offset h*d_model*d_head + i*d_head + j
    for (let h = 0; h < n_heads; h++) {
      const wqBase = h * d_model * d_head;
      const wkBase = h * d_model * d_head;
      const wvBase = h * d_model * d_head;
      const bqBase = h * d_head;
      const bkBase = h * d_head;
      const bvBase = h * d_head;

      for (let t = 0; t < T; t++) {
        const lOff = t * d_model;
        const qOff = t * n_heads * d_head + h * d_head;
        const kOff = qOff;
        const vOff = qOff;

        // Q[t,h,j] = Σ_i ln[t,i] * W_Q[h,i,j] + b_Q[h,j]
        for (let j = 0; j < d_head; j++) {
          let qSum = lw.b_Q[bqBase + j];
          let kSum = lw.b_K[bkBase + j];
          let vSum = lw.b_V[bvBase + j];
          const wqCol = wqBase + j; // W_Q[h][:, j] stride = d_head
          const wkCol = wkBase + j;
          const wvCol = wvBase + j;
          for (let i = 0; i < d_model; i++) {
            const lnVal = lnBuf[lOff + i];
            qSum += lnVal * lw.W_Q[wqCol + i * d_head];
            kSum += lnVal * lw.W_K[wkCol + i * d_head];
            vSum += lnVal * lw.W_V[wvCol + i * d_head];
          }
          qAll[qOff + j] = qSum;
          kAll[kOff + j] = kSum;
          vAll[vOff + j] = vSum;
        }
      }
    }

    // Causal self-attention + W_O projection + residual add
    // For each head h and position t:
    //   score[t,s] = (Q[t,h] · K[s,h]) / sqrt(d_head)   for s = 0..t
    //   attn[t,h,:] = softmax(score[t,:]) @ V[0..t,h,:]
    // Then:
    //   out[t] = Σ_h (attn[t,h,:] @ W_O[h,:,:]^T) + b_O
    //   residual[t] += out[t]
    const scale = 1 / Math.sqrt(d_head);
    const attnOut = new Float64Array(d_model); // accumulator per position

    for (let t = 0; t < T; t++) {
      // Zero accumulator
      for (let d = 0; d < d_model; d++) attnOut[d] = 0;

      for (let h = 0; h < n_heads; h++) {
        const qBase = t * n_heads * d_head + h * d_head;

        // Compute attention scores: score[s] = Q[t,h] · K[s,h] * scale
        const scores = new Float64Array(t + 1);
        let maxScore = -Infinity;
        for (let s = 0; s <= t; s++) {
          const kBase = s * n_heads * d_head + h * d_head;
          let dot = 0;
          for (let j = 0; j < d_head; j++) {
            dot += qAll[qBase + j] * kAll[kBase + j];
          }
          scores[s] = dot * scale;
          if (scores[s] > maxScore) maxScore = scores[s];
        }

        // Softmax (numerically stable)
        let sumExp = 0;
        for (let s = 0; s <= t; s++) {
          scores[s] = Math.exp(scores[s] - maxScore);
          sumExp += scores[s];
        }
        for (let s = 0; s <= t; s++) {
          scores[s] /= sumExp;
        }

        // Weighted sum of V, then project through W_O[h]
        // head_attn_out[dh] = Σ_s scores[s] * V[s,h,dh]
        // output += head_attn_out @ W_O[h]^T
        //        = Σ_dh head_attn_out[dh] * W_O[h][dh,d]
        const woBase = h * d_head * d_model;
        for (let s = 0; s <= t; s++) {
          const w = scores[s];
          if (w < 1e-30) continue; // skip negligible contributions
          const vBase = s * n_heads * d_head + h * d_head;
          for (let dh = 0; dh < d_head; dh++) {
            const vVal = w * vAll[vBase + dh];
            const woOff = woBase + dh * d_model;
            for (let d = 0; d < d_model; d++) {
              attnOut[d] += vVal * lw.W_O[woOff + d];
            }
          }
        }
      }

      // Residual add: residual[t] += attnOut + b_O
      const rOff = t * d_model;
      for (let d = 0; d < d_model; d++) {
        residual[rOff + d] += attnOut[d] + lw.b_O[d];
      }
    }
  }

  // ── Final LayerNorm → Unembed ──
  // logits[t] = W_U @ LayerNorm(residual[t])
  const logits = new Float64Array(T * d_vocab);
  const finalLn = new Float64Array(d_model);

  for (let t = 0; t < T; t++) {
    const rOff = t * d_model;
    layerNorm(
      residual.subarray(rOff, rOff + d_model),
      ln_final_w,
      ln_final_b,
      finalLn,
      d_model,
    );

    // logits[t,v] = Σ_d finalLn[d] * W_U[d,v]
    const lOff = t * d_vocab;
    for (let v = 0; v < d_vocab; v++) {
      let sum = 0;
      for (let d = 0; d < d_model; d++) {
        sum += finalLn[d] * W_U[d * d_vocab + v];
      }
      logits[lOff + v] = sum;
    }
  }

  return logits;
}

// ── Forward pass with attention patterns ────────────────────────────────────

/** Attention pattern: [n_layers][n_heads][T][T] (row-major within each). */
export type AttentionPatterns = number[][][][];

/**
 * Same as forward(), but also captures the softmax attention weights
 * for every layer, head, and (query, key) position pair.
 *
 * The returned patterns are plain number arrays for easy JSON handling
 * and React rendering.
 */
export function forwardWithPatterns(
  weights: ModelWeights,
  tokens: number[],
): { logits: Float64Array; patterns: AttentionPatterns } {
  const { config, W_E, W_pos, W_U, layers, ln_final_w, ln_final_b } = weights;
  const { d_model, n_heads, d_head, d_vocab } = config;
  const T = tokens.length;

  // ── 1. Token + positional embedding ──
  const residual = new Float64Array(T * d_model);
  for (let t = 0; t < T; t++) {
    const tok = tokens[t];
    const rOff = t * d_model;
    const eOff = tok * d_model;
    const pOff = t * d_model;
    for (let i = 0; i < d_model; i++) {
      residual[rOff + i] = W_E[eOff + i] + W_pos[pOff + i];
    }
  }

  // ── Attention pattern storage ──
  // patterns[layer][head][query][key] = attention weight
  const patterns: AttentionPatterns = [];
  for (let l = 0; l < layers.length; l++) {
    const layerPatterns: number[][][] = [];
    for (let h = 0; h < n_heads; h++) {
      const headPattern: number[][] = [];
      for (let t = 0; t < T; t++) {
        headPattern.push(new Array(T).fill(0));
      }
      layerPatterns.push(headPattern);
    }
    patterns.push(layerPatterns);
  }

  // ── Per-layer transformer blocks ──
  const lnBuf = new Float64Array(T * d_model);
  const qAll = new Float64Array(T * n_heads * d_head);
  const kAll = new Float64Array(T * n_heads * d_head);
  const vAll = new Float64Array(T * n_heads * d_head);

  for (let layer = 0; layer < layers.length; layer++) {
    const lw = layers[layer];

    // LayerNorm for all positions
    for (let t = 0; t < T; t++) {
      const rOff = t * d_model;
      layerNorm(
        residual.subarray(rOff, rOff + d_model),
        lw.ln1_w,
        lw.ln1_b,
        lnBuf.subarray(rOff, rOff + d_model),
        d_model,
      );
    }

    // Q, K, V projections
    for (let h = 0; h < n_heads; h++) {
      const wqBase = h * d_model * d_head;
      const wkBase = h * d_model * d_head;
      const wvBase = h * d_model * d_head;
      const bqBase = h * d_head;
      const bkBase = h * d_head;
      const bvBase = h * d_head;

      for (let t = 0; t < T; t++) {
        const lOff = t * d_model;
        const qOff = t * n_heads * d_head + h * d_head;

        for (let j = 0; j < d_head; j++) {
          let qSum = lw.b_Q[bqBase + j];
          let kSum = lw.b_K[bkBase + j];
          let vSum = lw.b_V[bvBase + j];
          const wqCol = wqBase + j;
          const wkCol = wkBase + j;
          const wvCol = wvBase + j;
          for (let i = 0; i < d_model; i++) {
            const lnVal = lnBuf[lOff + i];
            qSum += lnVal * lw.W_Q[wqCol + i * d_head];
            kSum += lnVal * lw.W_K[wkCol + i * d_head];
            vSum += lnVal * lw.W_V[wvCol + i * d_head];
          }
          qAll[qOff + j] = qSum;
          kAll[qOff + j] = kSum;
          vAll[qOff + j] = vSum;
        }
      }
    }

    // Attention + W_O projection + residual
    const scale = 1 / Math.sqrt(d_head);
    const attnOut = new Float64Array(d_model);

    for (let t = 0; t < T; t++) {
      for (let d = 0; d < d_model; d++) attnOut[d] = 0;

      for (let h = 0; h < n_heads; h++) {
        const qBase = t * n_heads * d_head + h * d_head;

        // Attention scores
        const scores = new Float64Array(t + 1);
        let maxScore = -Infinity;
        for (let s = 0; s <= t; s++) {
          const kBase = s * n_heads * d_head + h * d_head;
          let dot = 0;
          for (let j = 0; j < d_head; j++) {
            dot += qAll[qBase + j] * kAll[kBase + j];
          }
          scores[s] = dot * scale;
          if (scores[s] > maxScore) maxScore = scores[s];
        }

        // Softmax
        let sumExp = 0;
        for (let s = 0; s <= t; s++) {
          scores[s] = Math.exp(scores[s] - maxScore);
          sumExp += scores[s];
        }
        for (let s = 0; s <= t; s++) {
          scores[s] /= sumExp;
          // Store attention pattern
          patterns[layer][h][t][s] = scores[s];
        }

        // Weighted sum + W_O projection
        const woBase = h * d_head * d_model;
        for (let s = 0; s <= t; s++) {
          const w = scores[s];
          if (w < 1e-30) continue;
          const vBase = s * n_heads * d_head + h * d_head;
          for (let dh = 0; dh < d_head; dh++) {
            const vVal = w * vAll[vBase + dh];
            const woOff = woBase + dh * d_model;
            for (let d = 0; d < d_model; d++) {
              attnOut[d] += vVal * lw.W_O[woOff + d];
            }
          }
        }
      }

      // Residual add
      const rOff = t * d_model;
      for (let d = 0; d < d_model; d++) {
        residual[rOff + d] += attnOut[d] + lw.b_O[d];
      }
    }
  }

  // ── Final LayerNorm → Unembed ──
  const logits = new Float64Array(T * d_vocab);
  const finalLn = new Float64Array(d_model);

  for (let t = 0; t < T; t++) {
    const rOff = t * d_model;
    layerNorm(
      residual.subarray(rOff, rOff + d_model),
      ln_final_w,
      ln_final_b,
      finalLn,
      d_model,
    );

    const lOff = t * d_vocab;
    for (let v = 0; v < d_vocab; v++) {
      let sum = 0;
      for (let d = 0; d < d_model; d++) {
        sum += finalLn[d] * W_U[d * d_vocab + v];
      }
      logits[lOff + v] = sum;
    }
  }

  return { logits, patterns };
}
