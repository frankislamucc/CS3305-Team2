import Link from "next/link";
import Image from "next/image";

export default function LogoHeader() {
  return (
    <div className="flex items-center justify-center mb-8">
      <Link
        href="/"
        className="relative z-20 flex items-center space-x-3 px-2 py-1 group"
      >
        <Image
          src="/icons/slate-logo.svg"
          alt="logo"
          width={65}
          height={80}
          className="mix-blend-screen"
        />
        <span className="text-3xl font-bold text-black dark:text-white mt-.5 group-hover:opacity-80 transition-opacity">
          Slate
        </span>
      </Link>
    </div>
  );
}
