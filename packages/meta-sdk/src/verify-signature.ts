/**
 * X-Hub-Signature-256 署名検証
 */

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSig = signature.slice("sha256=".length);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const computedSig = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSig === expectedSig;
}
