import { Skeleton } from "@calls/ui";

export function SignUpFormSkeleton() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto mb-6 h-12 w-12 rounded-[10px]" />
          <Skeleton className="mx-auto mb-2 h-7 w-36" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>

        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-7 h-12 w-full rounded-lg" />

        <div className="mt-6 flex justify-center">
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
