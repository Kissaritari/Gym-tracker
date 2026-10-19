export function authErrorMessage(error: unknown): string {
  const failure = error as { code?: string; status?: number; name?: string; message?: string } | null
  switch (failure?.code) {
    case "invalid_credentials": return "Invalid email or password. Please try again."
    case "email_not_confirmed": return "Confirm your email using the link in your inbox before signing in."
    case "signup_disabled": return "New account registration is disabled. Contact the app administrator."
    case "email_provider_disabled": return "Email sign-in is disabled. Contact the app administrator."
    case "weak_password": return "Choose a stronger password that meets the account security requirements."
    case "email_address_invalid": return "Enter a valid email address."
    case "email_address_not_authorized": return "Confirmation email cannot be sent to this address. Contact the app administrator to configure email delivery."
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Too many attempts. Please wait a few minutes before trying again."
    case "unexpected_failure": return "The authentication service could not complete your request. Contact the app administrator."
  }
  if (failure?.status === 429) return "Too many attempts. Please wait a few minutes before trying again."
  if (failure?.message === "Invalid API key") return "Authentication configuration is invalid. Contact the app administrator."
  if (failure?.name === "AuthRetryableFetchError" || failure?.message?.match(/fetch|network/i)) {
    return "Could not reach the authentication service. Check your connection and try again."
  }
  return "We could not complete that request. Check your details and try again."
}
