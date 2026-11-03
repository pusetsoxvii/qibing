/** All interface text lives here so it can be translated later. */
export const t = {
  app: { signOut: "Log out", myAccount: "My Account" },
  login: {
    title: "Sign in",
    username: "Username",
    secret: "PIN or password",
    submit: "Sign in",
    signingIn: "Signing in…",
    wrong: "Wrong username or PIN",
    deactivated: "This account has been deactivated. Contact the office.",
    locked: (m: number) => `Too many attempts. Try again in ${m} minute${m === 1 ? "" : "s"}.`,
    forgot: "Forgot PIN?",
    forgotAnswer: "Ask the office (admin) to reset your PIN.",
    expired: "Your 12-hour session ended. Please sign in again.",
    network: "Can't reach the server. Check your signal and try again.",
  },
  notices: {
    "admin-only": "That page is for the office (admin) only.",
  } as Record<string, string>,
  generic: "Something went wrong. Please try again.",
};
