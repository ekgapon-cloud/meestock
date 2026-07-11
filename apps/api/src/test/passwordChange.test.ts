import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import { changePassword, login } from "../services/authService.js";
import { createUser, resetUserPassword } from "../services/userService.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

async function makeUser(email: string, password: string) {
  return createUser({ name: "Test User", email, password, role: "REQUESTER", accessLevel: "STAFF" });
}

describe("self-service change password", () => {
  it("changes the password when the current one is correct, and the new one works for login", async () => {
    const user = await makeUser("selfchange@test.local", "oldpass123");

    await changePassword(user.id, { currentPassword: "oldpass123", newPassword: "newpass456" });

    // new password logs in; old one no longer does
    await expect(login({ email: "selfchange@test.local", password: "newpass456" })).resolves.toMatchObject({
      employee: { email: "selfchange@test.local" },
    });
    await expect(login({ email: "selfchange@test.local", password: "oldpass123" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<AppError>);
  });

  it("rejects the change when the current password is wrong", async () => {
    const user = await makeUser("wrongcurrent@test.local", "oldpass123");

    await expect(
      changePassword(user.id, { currentPassword: "not-the-password", newPassword: "newpass456" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" } satisfies Partial<AppError>);

    // password unchanged — original still works
    await expect(login({ email: "wrongcurrent@test.local", password: "oldpass123" })).resolves.toBeDefined();
  });
});

describe("admin reset password", () => {
  it("sets a new password for a user (no current-password check) and never returns a hash", async () => {
    const user = await makeUser("resetme@test.local", "oldpass123");

    const updated = await resetUserPassword(user.id, { newPassword: "adminset999" });
    expect(updated).not.toHaveProperty("passwordHash");

    await expect(login({ email: "resetme@test.local", password: "adminset999" })).resolves.toMatchObject({
      employee: { email: "resetme@test.local" },
    });
    await expect(login({ email: "resetme@test.local", password: "oldpass123" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<AppError>);
  });
});
