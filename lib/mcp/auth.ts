function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkMcpToken(presented: string): boolean {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return false;
  return timingSafeEqual(presented, expected);
}
