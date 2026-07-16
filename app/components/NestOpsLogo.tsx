import { useId, type SVGProps } from "react";

interface NestOpsLogoProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

export function NestOpsLogo({ title = "NestOps", ...props }: NestOpsLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const nestGradientId = `${rawId}-nest`;
  const birdGradientId = `${rawId}-bird`;
  const wingGradientId = `${rawId}-wing`;
  const roofGradientId = `${rawId}-roof`;

  return (
    <svg
      aria-label={title}
      role="img"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id={nestGradientId}
          x1="15"
          y1="35"
          x2="49"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F59E0B" />
          <stop offset="0.48" stopColor="#D97706" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
        <linearGradient
          id={birdGradientId}
          x1="25"
          y1="17"
          x2="45"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2DD4BF" />
          <stop offset="0.52" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient
          id={wingGradientId}
          x1="20"
          y1="23"
          x2="34"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
        <linearGradient
          id={roofGradientId}
          x1="15"
          y1="19"
          x2="49"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#164E63" />
          <stop offset="0.5" stopColor="#0F766E" />
          <stop offset="1" stopColor="#155E75" />
        </linearGradient>
      </defs>
      <path
        d="M13.5 29.8 32 14.5l18.5 15.3"
        stroke={`url(#${roofGradientId})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 28.2V24l12.5-9.7L44.5 24v4.2"
        stroke="#A7F3D0"
        strokeOpacity="0.72"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 36.6c7.4 4.8 23.6 4.8 31 0"
        stroke={`url(#${nestGradientId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M20.5 43.2c5.9 3.3 17.1 3.3 23 0"
        stroke={`url(#${nestGradientId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M25.5 49c3.7 1.3 9.3 1.3 13 0"
        stroke={`url(#${nestGradientId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M31.6 25.2c3.8-7.2 12.7-8 18.1-3.9-6.2.4-10.2 3.7-12.5 9.4l-5.6-5.5Z"
        fill={`url(#${birdGradientId})`}
      />
      <path
        d="M31.1 25.6c-5.7-4.1-12.5-2.6-16.2 3.3 5.1-.8 9.4.8 13.1 5.3l3.1-8.6Z"
        fill={`url(#${wingGradientId})`}
      />
      <path
        d="M31.4 25.4c3.1 1.3 5.4 3.7 6.8 6.8-4.3.4-8.4-.2-12.3-2l5.5-4.8Z"
        fill="#0F766E"
        opacity="0.82"
      />
      <circle cx="41.8" cy="22.2" r="1.2" fill="#ECFEFF" />
      <path
        d="M49 20.8c1.4.3 2.6.9 3.7 1.8-1.6.3-3 .2-4.4-.2l.7-1.6Z"
        fill="#F59E0B"
      />
      <path
        d="M22 38c5.8 2.3 14.2 2.3 20 0"
        stroke="#FEF3C7"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
