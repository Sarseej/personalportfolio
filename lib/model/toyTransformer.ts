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

// ── SAE types and forward pass ──────────────────────────────────────────────

export interface SAEWeights {
  d_model: number;
  d_dict: number;
  encoderWeight: Float64Array; // [d_dict, d_model] row-major
  encoderBias: Float64Array; // [d_dict]
  decoderWeight: Float64Array; // [d_model, d_dict] row-major
}

export interface RawSAEWeights {
  d_model: number;
  d_dict: number;
  encoder_weight: number[][];
  encoder_bias: number[];
  decoder_weight: number[][];
}

/** Convert raw JSON SAE weights to flat typed arrays. */
export function loadSAEWeights(raw: RawSAEWeights): SAEWeights {
  return {
    d_model: raw.d_model,
    d_dict: raw.d_dict,
    encoderWeight: flatten(raw.encoder_weight),
    encoderBias: Float64Array.from(raw.encoder_bias),
    decoderWeight: flatten(raw.decoder_weight),
  };
}

/**
 * Run SAE encoder on a single residual stream vector.
 *
 *   features[i] = relu(Σ_j x[j] * encW[i,j] + encB[i])
 *
 * Returns the raw feature activations (pre-relu) and post-relu.
 */
export function saeEncode(
  sae: SAEWeights,
  x: Float64Array, // [d_model]
): { features: Float64Array; preRelu: Float64Array } {
  const { d_model, d_dict, encoderWeight, encoderBias } = sae;
  const preRelu = new Float64Array(d_dict);
  const features = new Float64Array(d_dict);

  for (let i = 0; i < d_dict; i++) {
    let sum = encoderBias[i];
    const wOff = i * d_model;
    for (let j = 0; j < d_model; j++) {
      sum += x[j] * encoderWeight[wOff + j];
    }
    preRelu[i] = sum;
    features[i] = sum > 0 ? sum : 0; // ReLU
  }

  return { features, preRelu };
}

/**
 * Run full SAE forward pass on the residual stream at all positions.
 * Returns feature activations [T, d_dict] and reconstructed residual [T, d_model].
 */
export function saeForward(
  sae: SAEWeights,
  residual: Float64Array, // [T * d_model]
  T: number,
): { features: Float64Array; reconstructed: Float64Array } {
  const { d_model, d_dict, decoderWeight } = sae;
  const features = new Float64Array(T * d_dict);
  const reconstructed = new Float64Array(T * d_model);

  for (let t = 0; t < T; t++) {
    const rOff = t * d_model;
    const fOff = t * d_dict;

    // Encode
    const { features: f } = saeEncode(
      sae,
      residual.subarray(rOff, rOff + d_model),
    );
    features.set(f, fOff);

    // Decode: recon = features @ decoderWeight^T
    // decoderWeight is [d_model, d_dict], stored row-major
    // recon[d] = Σ_i features[i] * decoderWeight[d * d_dict + i]
    for (let d = 0; d < d_model; d++) {
      let sum = 0;
      const dwOff = d * d_dict;
      for (let i = 0; i < d_dict; i++) {
        sum += f[i] * decoderWeight[dwOff + i];
      }
      reconstructed[rOff + d] = sum;
    }
  }

  return { features, reconstructed };
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
): { logits: Float64Array; patterns: AttentionPatterns; residual: Float64Array } {
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

  return { logits, patterns, residual };
}

// ── Causal patching ─────────────────────────────────────────────────────────

export interface PatchSpec {
  layer: number; // which layer's output residual to patch (0-indexed)
  position?: number; // single position (backward compat)
  positions?: number[]; // multiple positions (takes precedence if set)
}

function getPatchPositions(spec: PatchSpec): number[] {
  if (spec.positions && spec.positions.length > 0) return spec.positions;
  return spec.position !== undefined ? [spec.position] : [];
}

export interface PatchResult {
  cleanLogits: Float64Array; // [d_vocab] final-position logits, clean run
  corruptedLogits: Float64Array; // [d_vocab] final-position logits, corrupted run
  patchedLogits: Float64Array | null; // [d_vocab] final-position logits, patched run
}

/**
 * Run the full forward pass, returning logits for the final position
 * and the residual stream after each layer for every position.
 *
 * residualsAfter[l] is a Float64Array of length T * d_model containing
 * the residual stream after layer l (i.e. hook_resid_post for layer l).
 */
function forwardFull(
  weights: ModelWeights,
  tokens: number[],
): {
  logits: Float64Array;
  residualsAfter: Float64Array[];
} {
  const { config, W_E, W_pos, W_U, layers, ln_final_w, ln_final_b } = weights;
  const { d_model, n_heads, d_head, d_vocab } = config;
  const T = tokens.length;

  const residual = new Float64Array(T * d_model);
  for (let t = 0; t < T; t++) {
    const tok = tokens[t];
    const rOff = t * d_model;
    const eOff = tok * d_model;
    for (let i = 0; i < d_model; i++) {
      residual[rOff + i] = W_E[eOff + i] + W_pos[rOff + i];
    }
  }

  const residualsAfter: Float64Array[] = [];

  const lnBuf = new Float64Array(T * d_model);
  const qAll = new Float64Array(T * n_heads * d_head);
  const kAll = new Float64Array(T * n_heads * d_head);
  const vAll = new Float64Array(T * n_heads * d_head);

  for (let layer = 0; layer < layers.length; layer++) {
    const lw = layers[layer];

    for (let t = 0; t < T; t++) {
      layerNorm(
        residual.subarray(t * d_model, (t + 1) * d_model),
        lw.ln1_w,
        lw.ln1_b,
        lnBuf.subarray(t * d_model, (t + 1) * d_model),
        d_model,
      );
    }

    for (let h = 0; h < n_heads; h++) {
      const wBase = h * d_model * d_head;
      const bBase = h * d_head;
      for (let t = 0; t < T; t++) {
        const lOff = t * d_model;
        const oOff = t * n_heads * d_head + h * d_head;
        for (let j = 0; j < d_head; j++) {
          let qS = lw.b_Q[bBase + j];
          let kS = lw.b_K[bBase + j];
          let vS = lw.b_V[bBase + j];
          const col = wBase + j;
          for (let i = 0; i < d_model; i++) {
            const lv = lnBuf[lOff + i];
            qS += lv * lw.W_Q[col + i * d_head];
            kS += lv * lw.W_K[col + i * d_head];
            vS += lv * lw.W_V[col + i * d_head];
          }
          qAll[oOff + j] = qS;
          kAll[oOff + j] = kS;
          vAll[oOff + j] = vS;
        }
      }
    }

    const scale = 1 / Math.sqrt(d_head);
    const attnOut = new Float64Array(d_model);

    for (let t = 0; t < T; t++) {
      for (let d = 0; d < d_model; d++) attnOut[d] = 0;

      for (let h = 0; h < n_heads; h++) {
        const qBase = t * n_heads * d_head + h * d_head;
        const scores = new Float64Array(t + 1);
        let maxS = -Infinity;
        for (let s = 0; s <= t; s++) {
          const kBase = s * n_heads * d_head + h * d_head;
          let dot = 0;
          for (let j = 0; j < d_head; j++) dot += qAll[qBase + j] * kAll[kBase + j];
          scores[s] = dot * scale;
          if (scores[s] > maxS) maxS = scores[s];
        }
        let sumExp = 0;
        for (let s = 0; s <= t; s++) {
          scores[s] = Math.exp(scores[s] - maxS);
          sumExp += scores[s];
        }
        for (let s = 0; s <= t; s++) scores[s] /= sumExp;

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

      const rOff = t * d_model;
      for (let d = 0; d < d_model; d++) {
        residual[rOff + d] += attnOut[d] + lw.b_O[d];
      }
    }

    // Snapshot residual after this layer
    residualsAfter.push(new Float64Array(residual));
  }

  // Final LN + unembed
  const logits = new Float64Array(T * d_vocab);
  const finalLn = new Float64Array(d_model);
  for (let t = 0; t < T; t++) {
    const rOff = t * d_model;
    layerNorm(residual.subarray(rOff, rOff + d_model), ln_final_w, ln_final_b, finalLn, d_model);
    const lOff = t * d_vocab;
    for (let v = 0; v < d_vocab; v++) {
      let sum = 0;
      for (let d = 0; d < d_model; d++) sum += finalLn[d] * W_U[d * d_vocab + v];
      logits[lOff + v] = sum;
    }
  }

  return { logits, residualsAfter };
}

/**
 * Run a forward pass starting from a given residual state after layer
 * `startLayer`, continuing through all subsequent layers. Used to
 * recompute the forward pass after a patch has been applied.
 *
 * residualAtStart: [T * d_model] — the residual stream entering layer startLayer.
 * startLayer: the layer index to begin computation from.
 */
function forwardFromLayer(
  weights: ModelWeights,
  tokens: number[],
  residualAtStart: Float64Array,
  startLayer: number,
): Float64Array {
  const { config, W_U, layers, ln_final_w, ln_final_b } = weights;
  const { d_model, n_heads, d_head, d_vocab } = config;
  const T = tokens.length;

  const residual = new Float64Array(residualAtStart);

  const lnBuf = new Float64Array(T * d_model);
  const qAll = new Float64Array(T * n_heads * d_head);
  const kAll = new Float64Array(T * n_heads * d_head);
  const vAll = new Float64Array(T * n_heads * d_head);

  for (let layer = startLayer; layer < layers.length; layer++) {
    const lw = layers[layer];

    for (let t = 0; t < T; t++) {
      layerNorm(
        residual.subarray(t * d_model, (t + 1) * d_model),
        lw.ln1_w, lw.ln1_b,
        lnBuf.subarray(t * d_model, (t + 1) * d_model),
        d_model,
      );
    }

    for (let h = 0; h < n_heads; h++) {
      const wBase = h * d_model * d_head;
      const bBase = h * d_head;
      for (let t = 0; t < T; t++) {
        const lOff = t * d_model;
        const oOff = t * n_heads * d_head + h * d_head;
        for (let j = 0; j < d_head; j++) {
          let qS = lw.b_Q[bBase + j];
          let kS = lw.b_K[bBase + j];
          let vS = lw.b_V[bBase + j];
          const col = wBase + j;
          for (let i = 0; i < d_model; i++) {
            const lv = lnBuf[lOff + i];
            qS += lv * lw.W_Q[col + i * d_head];
            kS += lv * lw.W_K[col + i * d_head];
            vS += lv * lw.W_V[col + i * d_head];
          }
          qAll[oOff + j] = qS;
          kAll[oOff + j] = kS;
          vAll[oOff + j] = vS;
        }
      }
    }

    const scale = 1 / Math.sqrt(d_head);
    const attnOut = new Float64Array(d_model);

    for (let t = 0; t < T; t++) {
      for (let d = 0; d < d_model; d++) attnOut[d] = 0;

      for (let h = 0; h < n_heads; h++) {
        const qBase = t * n_heads * d_head + h * d_head;
        const scores = new Float64Array(t + 1);
        let maxS = -Infinity;
        for (let s = 0; s <= t; s++) {
          const kBase = s * n_heads * d_head + h * d_head;
          let dot = 0;
          for (let j = 0; j < d_head; j++) dot += qAll[qBase + j] * kAll[kBase + j];
          scores[s] = dot * scale;
          if (scores[s] > maxS) maxS = scores[s];
        }
        let sumExp = 0;
        for (let s = 0; s <= t; s++) {
          scores[s] = Math.exp(scores[s] - maxS);
          sumExp += scores[s];
        }
        for (let s = 0; s <= t; s++) scores[s] /= sumExp;

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

      const rOff = t * d_model;
      for (let d = 0; d < d_model; d++) {
        residual[rOff + d] += attnOut[d] + lw.b_O[d];
      }
    }
  }

  // Final LN + unembed — return logits for final position only
  const logits = new Float64Array(d_vocab);
  const finalLn = new Float64Array(d_model);
  const rOff = (T - 1) * d_model;
  layerNorm(residual.subarray(rOff, rOff + d_model), ln_final_w, ln_final_b, finalLn, d_model);
  for (let v = 0; v < d_vocab; v++) {
    let sum = 0;
    for (let d = 0; d < d_model; d++) sum += finalLn[d] * W_U[d * d_vocab + v];
    logits[v] = sum;
  }

  return logits;
}

/**
 * Causal patching: run clean and corrupted sequences, then swap the
 * residual at a specific (layer, position) from clean into corrupted.
 *
 * "Layer l" means the residual AFTER layer l's computation (hook_resid_post).
 * Patching at layer l, position p means: the corrupted run computes
 * normally through layer l, then at position p we overwrite the residual
 * with the clean run's residual at the same point, and re-run all
 * subsequent layers for positions >= p (causal: later positions attend
 * to earlier ones).
 *
 * Returns logits for the final position of each run.
 */
export function forwardPatched(
  weights: ModelWeights,
  cleanTokens: number[],
  corruptedTokens: number[],
  patchSpec: PatchSpec | null,
): PatchResult {
  const { config } = weights;
  const { d_model, d_vocab } = config;

  // 1. Full clean forward
  const clean = forwardFull(weights, cleanTokens);
  const Tc = corruptedTokens.length;

  // 2. Full corrupted forward
  const corrupted = forwardFull(weights, corruptedTokens);

  if (!patchSpec) {
    return {
      cleanLogits: clean.logits.slice((cleanTokens.length - 1) * config.d_vocab),
      corruptedLogits: corrupted.logits.slice((Tc - 1) * config.d_vocab),
      patchedLogits: null,
    };
  }

  const { layer: patchLayer } = patchSpec;
  const patchPositions = getPatchPositions(patchSpec);
  const nLayers = weights.config.n_layers;

  if (patchLayer >= nLayers) {
    // Patching "after the last layer" — swap final residual at all positions
    const patchedResidual = new Float64Array(corrupted.residualsAfter[nLayers - 1]);
    const cleanR = clean.residualsAfter[nLayers - 1];
    for (const p of patchPositions) {
      const pOff = p * d_model;
      for (let d = 0; d < d_model; d++) {
        patchedResidual[pOff + d] = cleanR[pOff + d];
      }
    }
    const patchedLogits = forwardFromLayer(weights, corruptedTokens, patchedResidual, nLayers);
    return {
      cleanLogits: clean.logits.slice((cleanTokens.length - 1) * config.d_vocab),
      corruptedLogits: corrupted.logits.slice((Tc - 1) * config.d_vocab),
      patchedLogits,
    };
  }

  const baseResidual = new Float64Array(corrupted.residualsAfter[patchLayer]);
  const cleanR = clean.residualsAfter[patchLayer];
  for (const p of patchPositions) {
    const pOff = p * d_model;
    for (let d = 0; d < d_model; d++) {
      baseResidual[pOff + d] = cleanR[pOff + d];
    }
  }

  // Recompute from the next layer onward
  const startLayer = patchLayer + 1;
  let patchedLogits: Float64Array;

  if (startLayer >= nLayers) {
    // Patch was at the last layer — compute logits directly from patched residual
    const { W_U, ln_final_w, ln_final_b } = weights;
    const finalLn = new Float64Array(d_model);
    patchedLogits = new Float64Array(config.d_vocab);
    const rOff = (Tc - 1) * d_model;
    layerNorm(baseResidual.subarray(rOff, rOff + d_model), ln_final_w, ln_final_b, finalLn, d_model);
    for (let v = 0; v < config.d_vocab; v++) {
      let sum = 0;
      for (let d = 0; d < d_model; d++) sum += finalLn[d] * W_U[d * d_vocab + v];
      patchedLogits[v] = sum;
    }
  } else {
    patchedLogits = forwardFromLayer(weights, corruptedTokens, baseResidual, startLayer);
  }

  return {
    cleanLogits: clean.logits.slice((cleanTokens.length - 1) * config.d_vocab),
    corruptedLogits: corrupted.logits.slice((Tc - 1) * config.d_vocab),
    patchedLogits,
  };
}
