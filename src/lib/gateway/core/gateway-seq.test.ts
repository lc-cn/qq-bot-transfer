import { describe, it, expect } from "vitest";
import { GatewaySeq, buildDispatch } from "./gateway-seq";

describe("GatewaySeq", () => {
  it("starts at value 1 (first next returns 2)", () => {
    const seq = new GatewaySeq();
    expect(seq.next()).toBe(2);
  });

  it("increments on each next()", () => {
    const seq = new GatewaySeq();
    expect(seq.next()).toBe(2);
    expect(seq.next()).toBe(3);
    expect(seq.next()).toBe(4);
  });

  it("seed sets floor but never decreases", () => {
    const seq = new GatewaySeq();
    seq.seed(100);
    expect(seq.next()).toBe(101);
    seq.seed(50); // lower than current — no effect
    expect(seq.next()).toBe(102);
  });

  it("seed with higher value raises floor", () => {
    const seq = new GatewaySeq();
    seq.seed(10);
    expect(seq.next()).toBe(11);
    seq.seed(50);
    expect(seq.next()).toBe(51);
  });

  it("next(present) uses present value and updates internal state", () => {
    const seq = new GatewaySeq();
    seq.next(); // 2
    seq.next(); // 3
    const val = seq.next(100);
    expect(val).toBe(100);
    // internal state is now at least 100
    expect(seq.next()).toBe(101);
  });

  it("next(present) with lower present takes max", () => {
    const seq = new GatewaySeq();
    seq.seed(50);
    const val = seq.next(10); // present < current
    expect(val).toBe(10); // returns present
    // but internal state stays at 50
    expect(seq.next()).toBe(51);
  });
});

describe("buildDispatch", () => {
  it("includes op, t, d, s fields", () => {
    const result = buildDispatch(
      { op: 0, t: "MESSAGE_CREATE", d: { content: "hi" } },
      42,
    );
    expect(result).toEqual({
      op: 0,
      t: "MESSAGE_CREATE",
      d: { content: "hi" },
      s: 42,
    });
  });

  it("includes id when present", () => {
    const result = buildDispatch(
      { op: 0, t: "READY", d: {}, id: "abc-123" },
      1,
    );
    expect(result.id).toBe("abc-123");
  });

  it("omits id when not present", () => {
    const result = buildDispatch({ op: 0, d: {} }, 1);
    expect(result).not.toHaveProperty("id");
  });

  it("omits t when not present", () => {
    const result = buildDispatch({ op: 1, d: null }, 5);
    expect(result.t).toBeUndefined();
    expect(result.op).toBe(1);
    expect(result.s).toBe(5);
  });
});
