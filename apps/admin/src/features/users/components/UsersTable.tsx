"use client";

import type { TAdminUser } from "@vidhan/schema";
import { Toggle } from "@/components/Toggle";
import { formatDate } from "@/features/lawyers/labels";

export type TUsersTableProps = {
  users: TAdminUser[];
  updatingId: string | undefined;
  onToggleSubscription: (id: string, next: boolean) => void;
};

const HEADERS = ["Name", "Email", "Plan", "Joined"];

export function UsersTable({
  users,
  updatingId,
  onToggleSubscription,
}: TUsersTableProps) {
  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No users found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {user.name}
              </td>
              <td className="px-3 py-2 text-slate-700">{user.email}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={user.isSubscribed}
                    disabled={updatingId === user.id}
                    label={`Subscription for ${user.name}`}
                    onChange={(next) => onToggleSubscription(user.id, next)}
                  />
                  <span className="text-slate-700">
                    {user.isSubscribed ? "Subscribed" : "Free"}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-slate-500">
                {formatDate(user.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
