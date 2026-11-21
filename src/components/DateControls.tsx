import { addDays, parseLocalDate, toDateInputValue } from '@lib/utils';

interface Props {
  date: Date;
  isToday: boolean;
  onChange: (date: Date) => void;
}

const control =
  'h-9 rounded-full border border-white/10 bg-white/5 text-sm transition-colors hover:bg-white/10 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moonlight/60 disabled:opacity-40 disabled:hover:bg-white/5';

export default function DateControls({ date, isToday, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button className={`${control} w-9`} onClick={() => onChange(addDays(date, -1))} aria-label="Previous day" title="Previous day (←)">
        ‹
      </button>

      <input
        type="date"
        className={`${control} px-4 tabular-nums`}
        value={toDateInputValue(date)}
        onChange={(event) => {
          // Partially typed dates come through as ''; ignore until complete.
          const parsed = parseLocalDate(event.target.value);
          if (parsed) onChange(parsed);
        }}
        aria-label="Date"
      />

      <button className={`${control} w-9`} onClick={() => onChange(addDays(date, 1))} aria-label="Next day" title="Next day (→)">
        ›
      </button>

      <button className={`${control} px-4`} onClick={() => onChange(new Date())} disabled={isToday}>
        Today
      </button>
    </div>
  );
}
