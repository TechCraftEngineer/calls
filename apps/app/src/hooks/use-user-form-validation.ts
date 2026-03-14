"use client";

import { useCallback, useState } from "react";
import type { EditUserForm } from "@/components/features/users/types";

export interface FormValidationError {
  field: string;
  message: string;
}

export function useUserFormValidation() {
  const [errors, setErrors] = useState<FormValidationError[]>([]);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, []);

  const validateForm = useCallback(
    (form: EditUserForm): FormValidationError[] => {
      const newErrors: FormValidationError[] = [];

      // Валидация имени
      if (!form.givenName.trim()) {
        newErrors.push({ field: "givenName", message: "Укажите имя." });
      }

      // Валидация email если указан
      if (form.email?.trim()) {
        if (!validateEmail(form.email)) {
          newErrors.push({
            field: "email",
            message: "Укажите корректный email адрес.",
          });
        }
      }

      // Валидация числовых полей
      if (form.filter_min_duration < 0) {
        newErrors.push({
          field: "filter_min_duration",
          message:
            "Минимальная длительность звонка не может быть отрицательной.",
        });
      }

      if (form.filter_min_replicas < 0) {
        newErrors.push({
          field: "filter_min_replicas",
          message: "Минимальное количество реплик не может быть отрицательным.",
        });
      }

      if (form.kpi_base_salary < 0) {
        newErrors.push({
          field: "kpi_base_salary",
          message: "Базовый оклад не может быть отрицательным.",
        });
      }

      if (form.kpi_target_bonus < 0) {
        newErrors.push({
          field: "kpi_target_bonus",
          message: "Целевой бонус не может быть отрицательным.",
        });
      }

      if (form.kpi_target_talk_time_minutes < 0) {
        newErrors.push({
          field: "kpi_target_talk_time_minutes",
          message: "Целевое время разговоров не может быть отрицательным.",
        });
      }

      return newErrors;
    },
    [validateEmail],
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
