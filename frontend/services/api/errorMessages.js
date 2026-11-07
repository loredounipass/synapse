export function getApiErrorMessage(error, fallback) {
  if (
    error?.body &&
    typeof error.body.error === "string" &&
    error.body.error.trim()
  ) {
    return error.body.error
  }
  if (
    Number.isInteger(error?.status) &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message
  }
  return fallback
}
