"""
Training loop for the induction head transformer.

Uses a raw PyTorch implementation for training speed (TransformerLens's
hook system adds ~130x overhead per forward/backward pass). After training,
weights are converted to TransformerLens format and saved for validation/export.

Architecture: 2 layers, 4 heads, d_model=128, no MLPs, with LayerNorm.
"""

import os
import sys
import time
import json
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, os.path.dirname(__file__))

from data import generate_batch


# ---------------------------------------------------------------------------
# Raw PyTorch model (matches TransformerLens HookedTransformer architecture)
# ---------------------------------------------------------------------------

class CausalSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        assert d_model % n_heads == 0
        self.W_Q = nn.Linear(d_model, d_model, bias=True)
        self.W_K = nn.Linear(d_model, d_model, bias=True)
        self.W_V = nn.Linear(d_model, d_model, bias=True)
        self.W_O = nn.Linear(d_model, d_model, bias=True)
        self.scale = self.d_head ** -0.5

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape
        q = self.W_Q(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = self.W_K(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = self.W_V(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) * self.scale
        causal_mask = torch.triu(torch.ones(T, T, device=x.device, dtype=torch.bool), diagonal=1)
        att.masked_fill_(causal_mask, float("-inf"))
        att = F.softmax(att, dim=-1)
        out = (att @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.W_O(out)


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = CausalSelfAttention(d_model, n_heads)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.attn(self.ln1(x))


class InductionTransformer(nn.Module):
    def __init__(self, d_model=128, n_heads=4, n_layers=2, d_vocab=50, n_ctx=128):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_layers = n_layers
        self.d_vocab = d_vocab
        self.n_ctx = n_ctx
        self.d_head = d_model // n_heads

        self.W_E = nn.Embedding(d_vocab, d_model)
        self.W_pos = nn.Embedding(n_ctx, d_model)
        self.blocks = nn.ModuleList(
            [TransformerBlock(d_model, n_heads) for _ in range(n_layers)]
        )
        self.ln_final = nn.LayerNorm(d_model)
        self.W_U = nn.Linear(d_model, d_vocab, bias=False)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        B, T = tokens.shape
        x = self.W_E(tokens) + self.W_pos(torch.arange(T, device=tokens.device))
        for block in self.blocks:
            x = block(x)
        x = self.ln_final(x)
        return self.W_U(x)


# ---------------------------------------------------------------------------
# Weight conversion: raw PyTorch -> TransformerLens state_dict format
# ---------------------------------------------------------------------------

def raw_to_transformerlens_state_dict(model: InductionTransformer) -> dict:
    """Convert raw PyTorch model weights to TransformerLens HookedTransformer format."""
    state = {}
    state["embed.W_E"] = model.W_E.weight
    state["pos_embed.W_pos"] = model.W_pos.weight
    state["unembed.W_U"] = model.W_U.weight.T  # [d_model, d_vocab]
    state["unembed.b_U"] = torch.zeros(model.d_vocab)

    for i, block in enumerate(model.blocks):
        prefix = f"blocks.{i}"
        state[f"{prefix}.ln1.w"] = block.ln1.weight
        state[f"{prefix}.ln1.b"] = block.ln1.bias
        # TransformerLens convention: W_Q/K/V are [n_heads, d_model, d_head]
        # Raw Linear weight is [out, in] = [d_model, d_model]
        # raw_out[h*32+dh] = x @ W[h*32+dh, :] → need TL_W[h, d, dh] = raw_W[h*32+dh, d]
        state[f"{prefix}.attn.W_Q"] = block.attn.W_Q.weight.view(
            model.n_heads, model.d_head, model.d_model
        ).permute(0, 2, 1).contiguous()
        state[f"{prefix}.attn.W_K"] = block.attn.W_K.weight.view(
            model.n_heads, model.d_head, model.d_model
        ).permute(0, 2, 1).contiguous()
        state[f"{prefix}.attn.W_V"] = block.attn.W_V.weight.view(
            model.n_heads, model.d_head, model.d_model
        ).permute(0, 2, 1).contiguous()
        # W_O: TL expects [n_heads, d_head, d_model]
        # raw_out[d] = attn_out @ W_O[d, :] → need TL_WO[h, dh, d] = raw_WO[d, h*32+dh]
        state[f"{prefix}.attn.W_O"] = block.attn.W_O.weight.view(
            model.d_model, model.n_heads, model.d_head
        ).permute(1, 2, 0).contiguous()
        state[f"{prefix}.attn.b_Q"] = block.attn.W_Q.bias.view(
            model.n_heads, model.d_head
        )
        state[f"{prefix}.attn.b_K"] = block.attn.W_K.bias.view(
            model.n_heads, model.d_head
        )
        state[f"{prefix}.attn.b_V"] = block.attn.W_V.bias.view(
            model.n_heads, model.d_head
        )
        state[f"{prefix}.attn.b_O"] = block.attn.W_O.bias

    state["ln_final.w"] = model.ln_final.weight
    state["ln_final.b"] = model.ln_final.bias

    # TransformerLens internal sentinel values (not trained parameters)
    for i in range(model.n_layers):
        state[f"blocks.{i}.attn.IGNORE"] = torch.tensor(float("-inf"))
        state[f"blocks.{i}.attn.mask"] = torch.empty(0, 0, dtype=torch.bool)

    return {k: v.detach().cpu() for k, v in state.items()}


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def train():
    device = get_device()

    d_model = 128
    n_heads = 4
    n_layers = 2
    d_vocab = 20
    n_ctx = 128
    batch_size = 512
    lr = 1e-2
    n_epochs = 2000
    seq_len = 100

    model = InductionTransformer(d_model, n_heads, n_layers, d_vocab, n_ctx).to(device)
    model.train()

    n_params = sum(p.numel() for p in model.parameters())
    print(f"Device: {device}", flush=True)
    print(f"Model: {n_layers}L x {n_heads}H, d_model={d_model}, vocab={d_vocab}", flush=True)
    print(f"Parameters: {n_params:,}", flush=True)
    print(f"Batch: {batch_size}, lr: {lr}, epochs: {n_epochs}", flush=True)
    print(f"{'Epoch':>6} {'Loss':>10} {'Status'}")
    print("-" * 40, flush=True)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, betas=(0.9, 0.999))
    grad_clip = 1.0

    losses = []
    best_loss = float("inf")
    patience_counter = 0
    checkpoint_dir = os.path.join(os.path.dirname(__file__), "checkpoints")
    os.makedirs(checkpoint_dir, exist_ok=True)

    t0 = time.time()

    for epoch in range(1, n_epochs + 1):
        tokens = generate_batch(batch_size, seq_len, d_vocab, device)
        logits = model(tokens)
        # Shift: logits[t] predicts token[t+1], not token[t]
        loss = F.cross_entropy(
            logits[:, :-1, :].reshape(-1, d_vocab),
            tokens[:, 1:].reshape(-1),
        )

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
        optimizer.step()

        avg_loss = loss.item()
        losses.append(avg_loss)

        if avg_loss < best_loss:
            best_loss = avg_loss
            patience_counter = 0
            # Save raw PyTorch checkpoint
            torch.save(model.state_dict(), os.path.join(checkpoint_dir, "model.pt"))
            # Also save TransformerLens-compatible checkpoint
            tl_state = raw_to_transformerlens_state_dict(model)
            torch.save(tl_state, os.path.join(checkpoint_dir, "model_tl.pt"))
            if epoch <= 20 or epoch % 25 == 0 or avg_loss < 0.01:
                elapsed = time.time() - t0
                print(f"{epoch:>6} {avg_loss:>10.6f} <- best  ({elapsed:.0f}s)", flush=True)
        else:
            patience_counter += 1

        if epoch % 50 == 0:
            elapsed = time.time() - t0
            print(f"{epoch:>6} {avg_loss:>10.6f}  ({elapsed:.0f}s)", flush=True)

        if patience_counter >= 100:
            print(f"\nEarly stopping at epoch {epoch}", flush=True)
            break

    # Final save
    torch.save(model.state_dict(), os.path.join(checkpoint_dir, "model.pt"))
    tl_state = raw_to_transformerlens_state_dict(model)
    torch.save(tl_state, os.path.join(checkpoint_dir, "model_tl.pt"))

    total_time = time.time() - t0
    print(f"\nFinal loss: {losses[-1]:.6f} (best: {best_loss:.6f})")
    print(f"Total time: {total_time:.0f}s ({total_time/60:.1f}min)")
    print(f"Checkpoint saved to {checkpoint_dir}/")

    # Save loss history
    with open(os.path.join(checkpoint_dir, "loss_history.json"), "w") as f:
        json.dump(losses, f)

    # Plot loss curve
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.figure(figsize=(8, 5))
    plt.plot(range(1, len(losses) + 1), losses, linewidth=1.5)
    plt.xlabel("Epoch")
    plt.ylabel("Cross-Entropy Loss")
    plt.title("Training Loss - Induction Head Model")
    plt.yscale("log")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    loss_path = os.path.join(os.path.dirname(__file__), "loss_curve.png")
    plt.savefig(loss_path, dpi=150)
    print(f"Loss curve saved to {loss_path}")

    return model, losses


if __name__ == "__main__":
    model, losses = train()
