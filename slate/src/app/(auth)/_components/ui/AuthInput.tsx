import { useState } from "react";

interface AuthInputProps {
  labelText: string;
  defaultText: string;
  promptText: string;
}

export default function AuthInput({
  labelText,
  defaultText,
  promptText,
}: AuthInputProps) {
  const [inputValue, setInputValue] = useState(defaultText);
  return (
    <div>
      <label
        htmlFor={defaultText}
        className="block text-sm font-medium text-white/80 mb-1.5"
      >
        {labelText}
      </label>
      <input
        id={defaultText}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (inputValue === defaultText) setInputValue("");
        }}
        onBlur={() => {
          if (inputValue === "") setInputValue(defaultText);
        }}
        required
        minLength={3}
        placeholder={promptText}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 backdrop-blur-sm outline-none transition-all focus:border-brand-select focus:ring-2 focus:ring-brand-select/30"
      />
    </div>
  );
}
