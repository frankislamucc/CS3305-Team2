interface OptionButtonProps {
  onClick?: () => void;
  isDisabled?: boolean;
  text: string;
}

export default function OptionButton({
  onClick,
  isDisabled = false,
  text,
}: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`px-3 py-1 text-sm rounded ${isDisabled ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"}`}
    >
      {text}
    </button>
  );
}
