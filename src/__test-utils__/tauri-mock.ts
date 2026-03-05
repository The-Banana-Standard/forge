import { vi } from "vitest";

/**
 * Shared mock for @tauri-apps/api/core.
 *
 * Usage in test files:
 *   import { mockInvoke } from "../../__test-utils__/tauri-mock";
 *   // mockInvoke is already wired as the invoke mock
 *   // Call mockInvoke.mockResolvedValue(...) etc. in your tests
 */
export const mockInvoke = vi.fn();
export const mockChannel = vi.fn().mockImplementation(() => ({
  onmessage: null as unknown,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  Channel: mockChannel,
}));

/**
 * Call this in beforeEach to reset the mock state.
 */
export function resetTauriMocks() {
  mockInvoke.mockReset();
  mockChannel.mockClear();
}
