import Link from "next/link";

export default function BackButton() {
  return (
    <p className="text-center mt-5">
      <Link
        href="/"
        className="text-neutral-600 hover:text-black dark:text-white/50 dark:hover:text-white text-sm transition-colors"
      >
        ← Back to home
      </Link>
    </p>
  );
}
