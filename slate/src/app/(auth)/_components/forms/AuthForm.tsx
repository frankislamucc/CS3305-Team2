import AuthInput from "../ui/AuthInput";

interface AuthFormProps {
  actionHandler: (formData: FormData) => void;
  isPending: boolean;
  submitButtonText: string;
}

export default function AuthForm({
  actionHandler,
  isPending,
  submitButtonText,
}: AuthFormProps) {
  return (
    <form action={actionHandler} className="space-y-4">
      <AuthInput
        labelText="username"
        defaultText="username"
        promptText="Enter your username"
      />
      <AuthInput
        labelText="password"
        defaultText="password"
        promptText="Enter your password"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
      >
        {submitButtonText}
      </button>
    </form>
  );
}
