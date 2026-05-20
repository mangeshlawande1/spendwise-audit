import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuditFormData, ToolEntry, UseCase } from "@/types";

interface FormStore {
  formData: AuditFormData;
  setTeamSize: (size: number) => void;
  setUseCase: (useCase: UseCase) => void;
  addTool: (entry: ToolEntry) => void;
  updateTool: (index: number, entry: ToolEntry) => void;
  removeTool: (index: number) => void;
  resetForm: () => void;
}

const DEFAULT_FORM: AuditFormData = {
  teamSize: 1,
  useCase: "mixed",
  tools: [],
};

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      formData: DEFAULT_FORM,

      setTeamSize: (size) =>
        set((state) => ({ formData: { ...state.formData, teamSize: size } })),

      setUseCase: (useCase) =>
        set((state) => ({ formData: { ...state.formData, useCase } })),

      addTool: (entry) =>
        set((state) => ({
          formData: {
            ...state.formData,
            tools: [...state.formData.tools, entry],
          },
        })),

      updateTool: (index, entry) =>
        set((state) => {
          const tools = [...state.formData.tools];
          tools[index] = entry;
          return { formData: { ...state.formData, tools } };
        }),

      removeTool: (index) =>
        set((state) => ({
          formData: {
            ...state.formData,
            tools: state.formData.tools.filter((_, i) => i !== index),
          },
        })),

      resetForm: () => set({ formData: DEFAULT_FORM }),
    }),
    {
      name: "spendwise-form", // localStorage key
    }
  )
);
