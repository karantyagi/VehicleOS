import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsoleModeToggle } from "./console-mode-toggle";

describe("ConsoleModeToggle", () => {
  it("keeps developer tools out of the normal owner navigation", () => {
    expect(renderToStaticMarkup(<ConsoleModeToggle />)).toBe("");
  });
});
