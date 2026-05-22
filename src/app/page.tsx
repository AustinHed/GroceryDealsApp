import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#ffffff] text-[#181d26]">
      <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#aa2d00_0%,#fcab79_27%,#f4d35e_49%,#a8d8c4_71%,#0a2e0e_100%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
        <div className="relative w-full">
          <h1 className="mx-auto max-w-4xl text-[clamp(3.25rem,8vw,6.75rem)] font-medium leading-[1.03] tracking-normal">
            Find Grocery Deals
          </h1>

          <form className="mx-auto mt-10 flex w-full max-w-2xl items-center rounded-full border border-[#dddddd] bg-white p-2 shadow-[0_24px_70px_rgba(24,29,38,0.08)] transition focus-within:border-[#9297a0] focus-within:shadow-[0_28px_84px_rgba(24,29,38,0.12)]">
            <label htmlFor="address" className="sr-only">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Enter your address"
              className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-4 text-base font-medium text-[#181d26] outline-none placeholder:text-[#41454d] sm:px-7 sm:text-lg"
            />
            <button
              type="submit"
              aria-label="Go"
              className="grid size-14 shrink-0 place-items-center rounded-full bg-[#181d26] text-white transition hover:bg-[#0d1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#458fff] sm:size-16"
            >
              <ArrowRight aria-hidden="true" className="size-6" strokeWidth={2.25} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
