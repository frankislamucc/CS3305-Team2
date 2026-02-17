"use client";

import AuthForm from "../_components/forms/AuthForm";
import Card from "../_components/ui/Card";
import { loginAction } from "../actions/login";
import { act, useActionState } from "react";

export default function LoginPage() {
  const [error, actionHandler, isPending] = useActionState(
    loginAction,
    undefined,
  );
  return (
    <>
      <Card
        headingText="Welcome back"
        subHeadingText="Sign in to get access"
        error={error}
      >
        <AuthForm
          actionHandler={actionHandler}
          isPending={isPending}
          submitButtonText="Log in"
        />
      </Card>
    </>
  );
}
