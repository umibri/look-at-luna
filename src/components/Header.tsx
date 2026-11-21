import type { Ref } from 'react';

export default function Header({ ref }: { ref?: Ref<HTMLElement> }) {
  return (
    <header ref={ref} className="relative z-10 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      <h1 className="font-display text-2xl tracking-wide">
        Look<span className="italic">at</span>Luna
      </h1>
    </header>
  );
}
