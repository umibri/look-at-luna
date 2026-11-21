import { addDays, parseLocalDate, toDateInputValue } from '@lib/utils';

interface Props {
  date: Date;
  onChange: (date: Date) => void;
}

const buttonClass =
  'px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-40';

export default function DateControls({ date, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button className={buttonClass} onClick={() => onChange(addDays(date, -1))} aria-label="Previous day" title="Previous day (←)">
        ◀
      </button>

      <input
        type="date"
        className="px-3 py-1.5 rounded bg-slate-800 text-sm"
        value={toDateInputValue(date)}
        onChange={(event) => {
          // Partially typed dates come through as ''; ignore until complete.
          const parsed = parseLocalDate(event.target.value);
          if (parsed) onChange(parsed);
        }}
        aria-label="Date"
      />

      <button className={buttonClass} onClick={() => onChange(addDays(date, 1))} aria-label="Next day" title="Next day (→)">
        ▶
      </button>

      <button className={buttonClass} onClick={() => onChange(new Date())}>
        Today
      </button>
    </div>
  );
}
