import { createContext, use, useState, type ReactNode } from "react";
import { useGroups } from "./queries";

type GroupState = { groupId: string | undefined; setGroupId: (id: string) => void };
const GroupContext = createContext<GroupState | null>(null);

/** Holds the group selected in the header, shared by all tabs. Defaults to the first group. */
export function GroupProvider({ children }: { children: ReactNode }) {
  const groups = useGroups();
  const [picked, setGroupId] = useState<string>();
  const groupId = groups.data?.some((g) => g.id === picked) ? picked : groups.data?.[0]?.id;
  return <GroupContext value={{ groupId, setGroupId }}>{children}</GroupContext>;
}

export function useSelectedGroup() {
  const ctx = use(GroupContext);
  if (!ctx) throw new Error("useSelectedGroup outside GroupProvider");
  return ctx;
}
