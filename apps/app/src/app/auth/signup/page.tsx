import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/features/auth/sign-up-form";
import { SignUpFormSkeleton } from "@/components/features/auth/sign-up-form-skeleton";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт в QBS Звонки — сервисе аналитики телефонных разговоров с помощью искусственного интеллекта.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFormSkeleton />}>
      <SignUpForm />
    </Suspense>
  );
}
