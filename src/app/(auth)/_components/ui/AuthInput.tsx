import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps {
  name: string;
  promptText: string;
  isPassword: boolean;
}

export default function AuthInput({
  name,
  promptText,
  isPassword,
}: AuthInputProps) {
  const [inputValue, setInputValue] = useState(promptText);
  const [isVisible, setIsVisible] = useState(isPassword);

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-white/80 mb-1.5"
      >
        {name}
      </label>
      <input
        id={name}
        name={name}
        type={isVisible ? "password" : "text"}
        onChange={(e) => setInputValue(e.target.value)}
        required
        placeholder={promptText}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 backdrop-blur-sm outline-none transition-all focus:border-brand-select focus:ring-2 focus:ring-brand-select/30"
      />
    </div>
  );
}
