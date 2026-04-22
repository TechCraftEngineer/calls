"use client";

import { useCallback, useState } from "react";
import { z } from "zod";
import { editUserFormSchema } from "@/lib/validations";

export interface FormValidationError {
  field: string;
  message: string;
}

const optionalEmailSchema = z.union([z.email(), z.literal("")]).optional();
const reportFiltersValidationSchema = editUserFormSchema.pick({
  givenName: true,
  email: true,
  filterMinDuration: true,
  filterMinReplicas: true,
});
type ReportFiltersValidationInput = z.input<typeof reportFiltersValidationSchema>;

export function useUserFormValidation() {
  const [errors, setErrors] = useState<FormValidationError[]>([]);

  const validateEmail = useCallback((email: string): boolean => {
    return optionalEmailSchema.safeParse(email || "").success;
  }, []);

  const validateForm = useCallback((form: ReportFiltersValidationInput): FormValidationError[] => {
    const result = reportFiltersValidationSchema.safeParse({
      givenName: form.givenName,
      email: form.email ?? "",
      filterMinDuration: form.filterMinDuration,
      filterMinReplicas: form.filterMinReplicas,
    });
    if (result.success) return [];
    return result.error.issues.map((e) => ({
      field: (e.path[0] as string) ?? "root",
      message: e.message,
    }));
  }, []);

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
