import { EventEmitter } from "node:events";
import type Phaser from "phaser";
import { expect, test, vi } from "vitest";
import { onSceneEnd } from "../phaser/lifecycle";
test("destroying a game releases scene resources even without shutdown", () => {
  const events = new EventEmitter(),
    dispose = vi.fn();
  onSceneEnd({ events } as unknown as Phaser.Scene, dispose);
  events.emit("destroy");
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(events.listenerCount("shutdown")).toBe(0);
});
test("scene restart and later destruction release each subscription exactly once", () => {
  const events = new EventEmitter(),
    first = vi.fn(),
    second = vi.fn(),
    scene = { events } as unknown as Phaser.Scene;
  onSceneEnd(scene, first);
  events.emit("shutdown");
  onSceneEnd(scene, second);
  events.emit("destroy");
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(events.eventNames()).toEqual([]);
});
