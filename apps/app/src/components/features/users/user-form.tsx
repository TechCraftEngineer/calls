/**
 * Форма создания/редактирования пользователя с react-hook-form и zod
 */

"use client";

import { Button, Input, PasswordInput, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  type CreateUserData,
  createUserSchema,
  type UpdateUserData,
  updateUserSchema,
} from "@/lib/validations";
import { useORPC } from "@/orpc/react";

interface UserFormProps {
  user?: UpdateUserData & { id: number };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const orpc = useORPC();
  const isEditing = !!user;
  const schema = isEditing ? updateUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
  } = useForm<CreateUserData | UpdateUserData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          email: String((user as { email?: string }).email ?? ""),
          givenName: String((user as Record<string, unknown>).givenName ?? ""),
          familyName: String(
            (user as Record<string, unknown>).familyName ?? "",
          ),
          internalExtensions: String(
            (user as Record<string, unknown>).internalExtensions ?? "",
          ),
          mobilePhones: String(
            (user as Record<string, unknown>).mobilePhones ?? "",
          ),
        }
      : {
          email: "",
          password: "",
          givenName: "",
          familyName: "",
          internalExtensions: "",
          mobilePhones: "",
        },
  });

  const updateMutation = useMutation(
    orpc.users.update.mutationOptions({
      onSuccess: () => {
        toast.success("Пользователь обновлён");
        onSuccess?.();
        reset();
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "Ошибка сохранения";
        setError("root", { message });
        toast.error(message);
      },
    }),
  );

  const createMutation = useMutation(
    orpc.users.create.mutationOptions({
      onSuccess: () => {
        toast.success("Пользователь создан");
        onSuccess?.();
        reset();
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "Ошибка сохранения";
        setError("root", { message });
        toast.error(message);
      },
    }),
  );

  const onSubmit = (data: CreateUserData | UpdateUserData) => {
    if (isEditing && user) {
      updateMutation.mutate({
        user_id: String(user.id),
        data: data as UpdateUserData,
      });
    } else {
      createMutation.mutate(data as CreateUserData);
    }
  };

  // Типизированные ошибки для разных схем
  const createErrors = errors as any;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-lg mx-auto p-6 bg-white rounded-xl border border-gray-200"
    >
      {errors.root && (
        <div className="p-3 rounded-lg text-sm font-medium flex items-center gap-2.5 mb-5 bg-error-50 text-error-600 border border-error-200">
          <span>⚠️</span>
          {errors.root.message}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Email *
          </label>
          <Input
            id="email"
            type="email"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              createErrors.email
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            } ${isEditing ? "bg-gray-50 cursor-not-allowed" : ""}`}
            placeholder="example@mail.com"
            disabled={isEditing}
            aria-invalid={!!createErrors.email}
            {...register("email")}
          />
          {createErrors.email && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {createErrors.email.message}
            </div>
          )}
        </div>

        {!isEditing && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-primary-800 mb-2"
            >
              Пароль *
            </label>
            <PasswordInput
              id="password"
              className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm transition-all duration-200 box-border ${
                createErrors.password
                  ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                  : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
              }`}
              placeholder="Минимум 6 символов"
              aria-invalid={!!createErrors.password}
              {...register("password")}
            />
            {createErrors.password && (
              <div className="text-error-600 text-xs mt-1 leading-tight">
                {createErrors.password.message}
              </div>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="givenName"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Имя *
          </label>
          <Input
            id="givenName"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.givenName
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="Иван"
            aria-invalid={!!errors.givenName}
            {...register("givenName")}
          />
          {errors.givenName && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {errors.givenName.message}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="familyName"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Фамилия
          </label>
          <Input
            id="familyName"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.familyName
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="Иванов"
            aria-invalid={!!errors.familyName}
            {...register("familyName")}
          />
          {errors.familyName && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {errors.familyName.message}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="internalExtensions"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Внутренние номера
          </label>
          <Input
            id="internalExtensions"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.internalExtensions
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="100,101,102"
            aria-invalid={!!errors.internalExtensions}
            {...register("internalExtensions")}
          />
          {errors.internalExtensions && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {errors.internalExtensions.message}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="mobilePhones"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Мобильные номера
          </label>
          <Input
            id="mobilePhones"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.mobilePhones
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="+79001234567,+79001234568"
            aria-invalid={!!errors.mobilePhones}
            {...register("mobilePhones")}
          />
          {errors.mobilePhones && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {errors.mobilePhones.message}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={updateMutation.isPending || createMutation.isPending}
          className="min-w-28"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending || createMutation.isPending}
          className="min-w-28"
        >
          {updateMutation.isPending || createMutation.isPending
            ? "Сохранение…"
            : isEditing
              ? "Сохранить изменения"
              : "Создать пользователя"}
        </Button>
      </div>
    </form>
  );
}
