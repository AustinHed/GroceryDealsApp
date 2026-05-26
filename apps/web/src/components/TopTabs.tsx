import Link from "next/link";

const tabs = [
  { href: "/", label: "home" },
  { href: "/meal-plan", label: "meal plan" },
  { href: "/test-weekly-deals", label: "test - weekly deals" },
];

export function TopTabs() {
  return (
    <nav className="fixed inset-x-0 top-2 z-20 mx-auto flex w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="rounded-md border border-[#d9dde5] bg-white px-4 py-2 text-sm font-medium text-[#181d26] shadow-[0_10px_24px_rgba(24,29,38,0.08)] transition hover:border-[#a6adb9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#458fff]"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
