"""
HookedTransformer configuration for a minimal attention-only model.

Architecture: 2 layers, 4 heads, d_model=128, no MLPs, with LayerNorm.
Matches the classic setup from Olsson et al. (2022) for studying
induction heads.
"""

from transformer_lens import HookedTransformer, HookedTransformerConfig


def build_model(
    d_model: int = 128,
    n_heads: int = 4,
    n_layers: int = 2,
    d_vocab: int = 50,
    n_ctx: int = 128,
    seed: int = 42,
    device: str = "cpu",
) -> HookedTransformer:
    """Create a small attention-only HookedTransformer from scratch."""
    cfg = HookedTransformerConfig(
        d_model=d_model,
        d_head=d_model // n_heads,
        n_heads=n_heads,
        n_layers=n_layers,
        n_ctx=n_ctx,
        d_vocab=d_vocab,
        attn_only=True,
        attention_dir="causal",
        normalization_type="LN",
        positional_embedding_type="standard",
        use_attn_result=True,
        seed=seed,
        device=device,
    )
    return HookedTransformer(cfg)


if __name__ == "__main__":
    model = build_model()
    print(f"Model config: {model.cfg.n_layers}L x {model.cfg.n_heads}H, "
          f"d_model={model.cfg.d_model}, d_head={model.cfg.d_head}")
    print(f"Vocab size: {model.cfg.d_vocab}")
    print(f"Total parameters: {sum(p.numel() for p in model.parameters()):,}")

    from data import generate_batch
    tokens = generate_batch(2, seq_len=10, vocab_size=50)
    logits = model(tokens)
    print(f"Forward pass OK: input {tokens.shape} -> logits {logits.shape}")
