"use client";

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 32,
  strokeWidth = 4,
  className = "",
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <svg
      className={`${className} -rotate-90 transform`.trim()}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        r={radius}
        cx={center}
        cy={center}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        fill="none"
        r={radius}
        cx={center}
        cy={center}
        className="text-green-500 transition-all duration-300 ease-in-out"
      />
    </svg>
  );
}
