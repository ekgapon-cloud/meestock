import type { Me } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../lib/api";
import { LogoutButton } from "./LogoutButton";
import { SidebarNav } from "./SidebarNav";

function initialsOf(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">M.EE Warehouse</div>
        <SidebarNav
          showUsers={me.accessLevel === "ADMIN"}
          showProjects={me.accessLevel === "ADMIN" || me.accessLevel === "MANAGER"}
        />
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initialsOf(me.name)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{me.name}</span>
            <span className="badge">{me.role}</span>
          </div>
        </div>
        <LogoutButton />
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
