const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password. Please try again.",
  email_not_confirmed: "Please confirm your email before signing in.",
  user_already_registered: "An account with this email already exists.",
  weak_password: "Password must be at least 8 characters.",
  signup_disabled: "Sign up is currently unavailable.",
  over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
};

export function toSafeAuthError(error: { message?: string; code?: string } | null): string {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }

  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  }
  if (message.includes("email not confirmed")) {
    return AUTH_ERROR_MESSAGES.email_not_confirmed;
  }
  if (message.includes("user already registered")) {
    return AUTH_ERROR_MESSAGES.user_already_registered;
  }
  if (message.includes("password")) {
    return AUTH_ERROR_MESSAGES.weak_password;
  }
  if (message.includes("rate limit")) {
    return AUTH_ERROR_MESSAGES.over_request_rate_limit;
  }
  if (message.includes("fetch failed")) {
    return "Cannot reach the authentication service. Check your network connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
