export class GatewaySeq {
  private value = 1;

  seed(seq: number): void {
    this.value = Math.max(this.value, seq);
  }

  next(present?: number): number {
    if (present !== undefined) {
      this.value = Math.max(this.value, present);
      return present;
    }
    return ++this.value;
  }
}

export function buildDispatch(
  payload: { op: number; t?: string; d: unknown; id?: string; s?: number },
  seq: number,
): Record<string, unknown> {
  const msg: Record<string, unknown> = {
    op: payload.op,
    t: payload.t,
    d: payload.d,
    s: seq,
  };
  if (payload.id) msg.id = payload.id;
  return msg;
}
