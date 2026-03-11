"use client";

import { useActionState } from "react";
import { registerAction } from "../actions/register";
import Card from "../_components/ui/Card";
import AuthForm from "../_components/forms/AuthForm";

export default function RegisterPage() {
  const [error, actionHandler, isPending] = useActionState(
    registerAction,
    undefined,
  );
  return (
    <>
      <Card
        headingText="Create an account"
        subHeadingText="Get started with Slate for free"
        error={error}
        isLoginPage={false}
      >
        <AuthForm
          actionHandler={actionHandler}
          isPending={isPending}
          submitButtonText="Create account"
        />
      </Card>
    </>
  );
}
