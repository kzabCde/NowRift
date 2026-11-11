import { expect, test } from "@playwright/test";

test("official transparent logo appears on guest gateway and throughout the web app", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".wordmark img")).toHaveAttribute(
    "src",
    "/branding/nowrift-logo-transparent.png",
  );
  await expect(page.locator(".gateway-official-logo")).toHaveAttribute(
    "src",
    "/branding/nowrift-logo-transparent.png",
  );
  const obsolete = await page.request.get("/branding/nowrift-logo-black.png");
  expect(obsolete.status()).toBe(404);
  await page.getByRole("button", { name: "Practice & legacy tools" }).click();
  await expect(page.locator(".wordmark img")).toBeVisible();
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await expect(page.locator(".wordmark img")).toBeVisible();
});

test("favicon and install icons are all real PNGs with matching dimensions", async ({
  request,
}) => {
  for (const [path, dimension] of [
    ["/icons/favicon-48.png", 48],
    ["/icons/icon-192.png", 192],
    ["/icons/icon-512.png", 512],
    ["/icons/icon-maskable-512.png", 512],
    ["/icons/apple-touch-icon.png", 180],
  ] as const) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const bytes = await response.body();
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(dimension);
    expect(bytes.readUInt32BE(20)).toBe(dimension);
  }
});
