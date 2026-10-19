// Reusable loading placeholder for table bodies (used by every Admin list
// screen) so a fetch-in-progress shows pulsing rows instead of a blank table.
// Render it inside <tbody> in place of the real rows while `loading` is true.
const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="px-6 py-4">
            <div
              className="h-3.5 animate-pulse rounded bg-ledger-100"
              style={{ width: c === 0 ? '70%' : `${45 + ((r + c) % 3) * 15}%` }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default TableSkeleton;
