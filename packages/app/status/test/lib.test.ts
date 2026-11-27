import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Channel } from "../src/lib/channel.ts";
import { Queue } from "../src/lib/queue.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Channel", () => {
  it("publishes the latest value to subscribers", () => {
    const channel = new Channel<number>(0);
    const seen: number[] = [];
    channel.subscribe((value) => seen.push(value));

    channel.publish(1);
    channel.publish(2);

    assert.equal(channel.value, 2);
    assert.deepEqual(seen, [1, 2]);
  });

  it("stops notifying after unsubscribe", () => {
    const channel = new Channel<number>(0);
    const seen: number[] = [];
    const unsubscribe = channel.subscribe((value) => seen.push(value));

    channel.publish(1);
    unsubscribe();
    channel.publish(2);

    assert.deepEqual(seen, [1]);
  });
});

describe("Queue", () => {
  it("rejects a non-positive concurrency", () => {
    assert.throws(() => new Queue(0), /invalid concurrency/);
  });

  it("never runs more tasks than the concurrency limit", async () => {
    const queue = new Queue(2);
    let running = 0;
    let peak = 0;

    const task = async (value: number) => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      await tick();
      running--;
      return value;
    };

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((value) => queue.enqueue(() => task(value))),
    );

    assert.equal(peak, 2);
    assert.deepEqual(results, [1, 2, 3, 4, 5]);
  });

  it("releases its slot when a task throws", async () => {
    const queue = new Queue(1);

    await assert.rejects(
      queue.enqueue(async () => {
        throw new Error("boom");
      }),
      /boom/,
    );
    assert.equal(await queue.enqueue(async () => "ok"), "ok");
  });

  it("resolves queued tasks with null once cleared", async () => {
    const queue = new Queue(1);
    let release: () => void = () => {};
    const blocker = queue.enqueue(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const queued = queue.enqueue(async () => "never");

    queue.clear();

    assert.equal(await queued, null);
    release();
    await blocker;
  });
});
