/**
 * Форма создания/редактирования пользователя с react-hook-form и zod
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { usersApi } from "@/lib/api-orpc";
import {
  type CreateUserData,
  createUserSchema,
  type UpdateUserData,
  updateUserSchema,
} from "@/lib/validations";

interface UserFormProps {
  user?: UpdateUserData & { id: number };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!user;
  const schema = isEditing ? updateUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserData | UpdateUserData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          username: String((user as { username?: string }).username ?? ""),
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
          username: "",
          password: "",
          confirmPassword: "",
          givenName: "",
          familyName: "",
          internalExtensions: "",
          mobilePhones: "",
        },
  });

  const onSubmit = async (data: CreateUserData | UpdateUserData) => {
    try {
      if (isEditing && user) {
        // Редактирование пользователя
        await usersApi.update(user.id, data as UpdateUserData);
      } else {
        // Создание нового пользователя
        await usersApi.create(data as CreateUserData);
      }

      onSuccess?.();
      reset();
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.detail ||
        (err as Error).message ||
        "Ошибка сохранения";
      setError("root", { message });
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
            htmlFor="username"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Email *
          </label>
          <input
            id="username"
            type="email"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              createErrors.username
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            } ${isEditing ? "bg-gray-50 cursor-not-allowed" : ""}`}
            placeholder="example@mail.com"
            disabled={isEditing}
            {...register("username")}
          />
          {createErrors.username && (
            <div className="text-error-600 text-xs mt-1 leading-tight">
              {createErrors.username.message}
            </div>
          )}
        </div>

        {!isEditing && (
          <>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-primary-800 mb-2"
              >
                Пароль *
              </label>
              <input
                id="password"
                type="password"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
                  createErrors.password
                    ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                    : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
                }`}
                placeholder="Минимум 6 символов"
                {...register("password")}
              />
              {createErrors.password && (
                <div className="text-error-600 text-xs mt-1 leading-tight">
                  {createErrors.password.message}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-primary-800 mb-2"
              >
                Подтвердите пароль *
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
                  createErrors.confirmPassword
                    ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                    : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
                }`}
                placeholder="Повторите пароль"
                {...register("confirmPassword")}
              />
              {createErrors.confirmPassword && (
                <div className="text-error-600 text-xs mt-1 leading-tight">
                  {createErrors.confirmPassword.message}
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="givenName"
            className="block text-sm font-semibold text-primary-800 mb-2"
          >
            Имя *
          </label>
          <input
            id="givenName"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.givenName
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="Иван"
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
          <input
            id="familyName"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.familyName
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="Иванов"
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
          <input
            id="internalExtensions"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.internalExtensions
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="100,101,102"
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
          <input
            id="mobilePhones"
            type="text"
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 box-border ${
              errors.mobilePhones
                ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
            }`}
            placeholder="+79001234567,+79001234568"
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
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 border-none min-w-28 bg-gray-100 text-primary-800 border border-gray-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 border-none min-w-28 bg-primary-900 text-white hover:bg-primary-800 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Сохранение…"
            : isEditing
              ? "Сохранить изменения"
              : "Создать пользователя"}
        </button>
      </div>
    </form>
  );
}
