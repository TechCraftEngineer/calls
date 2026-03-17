"use client";

import { useCallback, useState } from "react";
import { z } from "zod";
import type { EditUserForm } from "@/components/features/users/types";
import { editUserFormSchema } from "@/lib/validations";

export interface FormValidationError {
  field: string;
  message: string;
}

const optionalEmailSchema = z
  .union([z.string().email(), z.literal("")])
  .optional();

export function useUserFormValidation() {
  const [errors, setErrors] = useState<FormValidationError[]>([]);

  const validateEmail = useCallback((email: string): boolean => {
    return optionalEmailSchema.safeParse(email || "").success;
  }, []);

  const validateForm = useCallback(
    (form: EditUserForm): FormValidationError[] => {
      const result = editUserFormSchema.safeParse({
        givenName: form.givenName,
        email: form.email ?? "",
        filterMinDuration: form.filterMinDuration,
        filterMinReplicas: form.filterMinReplicas,
        kpiBaseSalary: form.kpiBaseSalary,
        kpiTargetBonus: form.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: form.kpiTargetTalkTimeMinutes,
      });
      if (result.success) return [];
      return result.error.issues.map((e) => ({
        field: (e.path[0] as string) ?? "root",
        message: e.message,
      }));
    },
    [],
  );

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getFirstError = useCallback((): string => {
    return errors.length > 0 ? errors[0].message : "";
  }, [errors]);

  return {
    errors,
    validateForm,
    clearErrors,
    getFirstError,
    validateEmail,
  };
}
