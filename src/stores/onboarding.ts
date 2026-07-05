import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConnectedAccount = {
  id: string;
  provider: "google-workspace" | "gmail" | "microsoft-365" | "outlook" | "imap" | "smtp";
  email: string;
};

type OnboardingState = {
  workspaceName: string;
  workspaceSlug: string;
  invites: string[];
  accounts: ConnectedAccount[];
  businessType: string | null;
  setWorkspace: (name: string, slug: string) => void;
  addInvite: (email: string) => void;
  removeInvite: (email: string) => void;
  addAccount: (a: ConnectedAccount) => void;
  removeAccount: (id: string) => void;
  setBusinessType: (t: string) => void;
  reset: () => void;
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      workspaceName: "",
      workspaceSlug: "",
      invites: [],
      accounts: [],
      businessType: null,
      setWorkspace: (workspaceName, workspaceSlug) => set({ workspaceName, workspaceSlug }),
      addInvite: (email) =>
        set((s) => (s.invites.includes(email) ? s : { invites: [...s.invites, email] })),
      removeInvite: (email) => set((s) => ({ invites: s.invites.filter((e) => e !== email) })),
      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      setBusinessType: (businessType) => set({ businessType }),
      reset: () =>
        set({
          workspaceName: "",
          workspaceSlug: "",
          invites: [],
          accounts: [],
          businessType: null,
        }),
    }),
    { name: "byteback-onboarding" },
  ),
);
