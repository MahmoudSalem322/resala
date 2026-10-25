export function rateLimitMessage(response: Response): string {
  const seconds = Number(response.headers.get("Retry-After"));
  if (!Number.isFinite(seconds) || seconds <= 0) return "طلبات كثيرة. استنى شوي وحاول مرة ثانية.";
  const duration = seconds >= 60 ? `${Math.ceil(seconds / 60)} دقيقة` : `${Math.ceil(seconds)} ثانية`;
  return `طلبات كثيرة. استنى ${duration} وحاول مرة ثانية.`;
}
