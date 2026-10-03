import { z } from "zod/v4";
import { ZAdminUser } from "@vidhan/schema";
import type { TAdminUser, TAdminUserUpdate } from "@vidhan/schema";
import { apiFetch } from "@/lib/api";

const ZAdminUserList = z.object({
  users: z.array(ZAdminUser),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const ZAdminUserEnvelope = z.object({ user: ZAdminUser });

export type TAdminUserPage = z.infer<typeof ZAdminUserList>;

export async function listUsers(params: {
  page: number;
  search: string;
}): Promise<TAdminUserPage> {
  const payload = await apiFetch("/admin/users", {
    query: { page: params.page, search: params.search || undefined },
  });
  return ZAdminUserList.parse(payload);
}

export async function updateUserSubscription(
  id: string,
  input: TAdminUserUpdate,
): Promise<TAdminUser> {
  const payload = await apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  return ZAdminUserEnvelope.parse(payload).user;
}
