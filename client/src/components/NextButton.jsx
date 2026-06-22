export default function NextButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed font-semibold text-white shadow-lg transition-colors"
    >
      Next
    </button>
  );
}
