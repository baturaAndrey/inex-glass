/**
 * Setup for the `dom` Vitest project: jest-dom matchers (`toBeInTheDocument`, ...) and
 * their type augmentation for `expect`. Testing Library auto-cleanup is skipped because
 * Vitest globals are off, so unmount explicitly after each test.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
