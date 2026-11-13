import { andalanAttendanceService } from "../api/andalan-attendance.service";

const toBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const toBase64Url = (value: ArrayBuffer | ArrayLike<number>) => {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : Uint8Array.from(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const assertSupported = () => {
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("Face ID/biometrik membutuhkan HTTPS atau localhost pada browser.");
  }
};

const toCreationOptions = (options: any): PublicKeyCredentialCreationOptions => ({
  ...options.publicKey,
  challenge: toBytes(options.publicKey.challenge),
  user: {
    ...options.publicKey.user,
    id: toBytes(options.publicKey.user.id),
  },
  excludeCredentials: (options.publicKey.excludeCredentials ?? []).map((item: any) => ({
    ...item,
    id: toBytes(item.id),
  })),
});

const toRequestOptions = (options: any): PublicKeyCredentialRequestOptions => ({
  ...options.publicKey,
  challenge: toBytes(options.publicKey.challenge),
  allowCredentials: (options.publicKey.allowCredentials ?? []).map((item: any) => ({
    ...item,
    id: toBytes(item.id),
  })),
});

const serializeRegistration = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
    },
  };
};

const serializeAuthentication = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      authenticatorData: toBase64Url(response.authenticatorData),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
    },
  };
};

export const registerBiometric = async () => {
  assertSupported();
  const options = await andalanAttendanceService.biometricOptions("register");
  const credential = await navigator.credentials.create({ publicKey: toCreationOptions(options) });
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error("Perangkat tidak mengembalikan credential biometrik.");
  }
  const result = await andalanAttendanceService.biometricRegister(serializeRegistration(credential));
  sessionStorage.setItem("andara_biometric_registered", "1");
  return result;
};

export const authenticateBiometric = async () => {
  assertSupported();
  const options = await andalanAttendanceService.biometricOptions("authenticate");
  const credential = await navigator.credentials.get({ publicKey: toRequestOptions(options) });
  if (!credential || !(credential instanceof PublicKeyCredential)) {
    throw new Error("Verifikasi biometrik dibatalkan.");
  }
  const result = await andalanAttendanceService.biometricVerify(serializeAuthentication(credential));
  return result.biometric_token;
};
