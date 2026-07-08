import { beforeEach, describe, expect, it } from "vitest";
import { createUser, getUser, updateUser } from "../services/userService.js";
import { createEmployee } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("access control admin — user management", () => {
  it("never returns passwordHash", async () => {
    const admin = await createEmployee({ role: "WAREHOUSE", accessLevel: "ADMIN" });
    const user = await getUser(admin.id);
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects creating a user with an email that's already taken", async () => {
    await createUser({ name: "First", email: "dup@test.local", password: "password123", role: "REQUESTER", accessLevel: "STAFF" });
    await expect(
      createUser({ name: "Second", email: "dup@test.local", password: "password123", role: "REQUESTER", accessLevel: "STAFF" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("stops an admin from removing their own ADMIN access level", async () => {
    const admin = await createEmployee({ role: "WAREHOUSE", accessLevel: "ADMIN" });
    await expect(updateUser(admin.id, { accessLevel: "STAFF" }, admin.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("stops an admin from deactivating their own account", async () => {
    const admin = await createEmployee({ role: "WAREHOUSE", accessLevel: "ADMIN" });
    await expect(updateUser(admin.id, { isActive: false }, admin.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("still allows an admin to change another employee's access level or active state", async () => {
    const admin = await createEmployee({ role: "WAREHOUSE", accessLevel: "ADMIN" });
    const other = await createEmployee({ role: "REQUESTER", accessLevel: "STAFF" });

    const updated = await updateUser(other.id, { accessLevel: "MANAGER", isActive: false }, admin.id);
    expect(updated.accessLevel).toBe("MANAGER");
    expect(updated.isActive).toBe(false);
  });
});
